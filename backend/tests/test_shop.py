from app.models import User
from app.services.character import crossed, rank_for, stage_for
from app.services.shop import CATALOG, ShopError, purchase


def _channel(hex_color, index):
    value = int(hex_color[1 + index * 2:3 + index * 2], 16) / 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def _ratio(cell, ink):
    def lum(color):
        r, g, b = (_channel(color, 0), _channel(color, 1), _channel(color, 2))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    lighter, darker = sorted((lum(cell), lum(ink)), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


def test_theme_ink_stays_readable_on_the_cell():
    themed = [item for item in CATALOG if "cell" in item["preview"] and "ink" in item["preview"]]
    assert {item["id"] for item in themed} >= {
        "theme-space", "theme-forest", "theme-sea", "theme-candy", "theme-night", "bg-dawn", "bg-meadow", "bg-ink",
    }
    for item in themed:
        ratio = _ratio(item["preview"]["cell"], item["preview"]["ink"])
        assert ratio >= 4.5, f"{item['id']} contrast {ratio:.2f} is below 4.5"


def test_theme_surfaces_keep_a_light_board_and_a_readable_room():
    for item in CATALOG:
        if item["type"] not in ("theme", "background"):
            continue
        palette = item["preview"]
        # The board stays paper-light. The room keeps the theme color without the old near-black canvas.
        assert _ratio(palette["cell"], "#000000") >= 14
        assert _ratio(palette["room"], "#000000") >= 7
        assert _ratio(palette["ink"], palette["room"]) >= 4.5
        assert _ratio(palette["ink"], palette["cell"]) >= 4.5
        assert _ratio(palette["cell"], palette["line"]) >= 3


def test_stage_and_rank_follow_solved_counts():
    assert stage_for(0) == "egg"
    assert stage_for(9) == "egg"
    assert stage_for(10) == "chick"
    assert stage_for(49) == "chick"
    assert stage_for(50) == "young"
    assert stage_for(150) == "wise"
    assert stage_for(400) == "legend"
    assert rank_for(4) is None
    assert rank_for(5) == "apprentice"
    assert rank_for(20) == "journeyman"
    assert rank_for(50) == "master"
    assert rank_for(100) == "grandmaster"
    assert crossed(9, 10, (("chick", 10), ("young", 50))) == "chick"
    assert crossed(10, 11, (("chick", 10),)) is None


def test_purchase_rejects_a_short_balance(app, student):
    user_id = student["user"]["id"]
    with app.app_context():
        user = db_user(user_id)
        user.star_balance = 10
        try:
            purchase(user, "theme-forest")
            raised = False
        except ShopError as exc:
            raised = exc.status == 402
        assert raised
        assert user.star_balance == 10


def test_the_same_item_cannot_be_bought_twice(app, student):
    user_id = student["user"]["id"]
    with app.app_context():
        user = db_user(user_id)
        user.star_balance = 80
        purchase(user, "theme-sea")
        try:
            purchase(user, "theme-sea")
            raised = False
        except ShopError as exc:
            raised = exc.status == 409
        assert raised
        assert user.star_balance == 50


def db_user(user_id):
    from app.extensions import db

    return db.session.get(User, user_id)


def test_an_owl_card_is_bought_once_for_its_price(app, student):
    from app.extensions import db
    from app.models.shop import UserItem
    from app.models.star import StarLedger

    user_id = student["user"]["id"]
    with app.app_context():
        user = db_user(user_id)
        user.star_balance = 15
        db.session.commit()
        purchase(user, "owl-little")
        db.session.commit()
        assert db_user(user_id).star_balance == 0
        assert UserItem.query.filter_by(user_id=user_id, item_id="owl-little").one().equipped is False
        ledger = StarLedger.query.filter_by(user_id=user_id, reason="purchase").one()
        assert ledger.amount == -15
        try:
            purchase(db_user(user_id), "owl-little")
            raised = False
        except ShopError as exc:
            raised = exc.status == 409
        assert raised

        user = db_user(user_id)
        user.star_balance = 10
        db.session.commit()
        try:
            purchase(user, "owl-pygmy")
            short = False
        except ShopError as exc:
            short = exc.status == 402
        assert short
        assert db_user(user_id).star_balance == 10
        assert UserItem.query.filter_by(user_id=user_id, item_id="owl-pygmy").first() is None


def test_accessory_refund_returns_the_price_paid(app, student):
    from app.extensions import db
    from app.models.shop import UserItem
    from app.models.star import StarLedger
    from app.services.shop import refund_accessories

    user_id = student["user"]["id"]
    with app.app_context():
        user = db_user(user_id)
        user.star_balance = 4
        db.session.add(UserItem(user_id=user_id, item_id="hat-red", equipped=True))
        db.session.add(UserItem(user_id=user_id, item_id="crown-gold", equipped=False))
        db.session.add(UserItem(user_id=user_id, item_id="theme-forest", equipped=True))
        db.session.commit()
        refund_accessories(db.session.connection())
        db.session.commit()
        db.session.expire_all()
        assert db_user(user_id).star_balance == 4 + 15 + 50
        refunds = StarLedger.query.filter_by(user_id=user_id, reason="refund").all()
        assert sorted(row.amount for row in refunds) == [15, 50]
        left = {row.item_id for row in UserItem.query.filter_by(user_id=user_id).all()}
        assert left == {"theme-forest"}


def test_the_owl_expert_certificate_arrives_with_the_twelfth_card(app, student):
    from app.extensions import db
    from app.models import Certificate

    user_id = student["user"]["id"]
    owls = [item for item in CATALOG if item["type"] == "owl"]
    assert len(owls) == 12
    with app.app_context():
        user = db_user(user_id)
        user.star_balance = sum(item["price"] for item in owls)
        db.session.commit()
        for item in owls[:-1]:
            purchase(user, item["id"])
        db.session.commit()
        assert Certificate.query.filter_by(user_id=user_id, kind="owl-expert").first() is None
        purchase(user, owls[-1]["id"])
        db.session.commit()
        row = Certificate.query.filter_by(user_id=user_id, kind="owl-expert").one()
        assert row.kind == "owl-expert"
