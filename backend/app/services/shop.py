"""Dükkân kataloğu. Temalar görünümü değiştirir; baykuş kartları koleksiyondur."""

import uuid
from datetime import datetime

from sqlalchemy import text

from app.extensions import db
from app.models.shop import UserItem
from app.models.star import StarLedger


class ShopError(Exception):
    def __init__(self, message, status):
        super().__init__(message)
        self.status = status


# Açık, yumuşak zeminler; oyunlarda koyu yazı ve belirgin işaretler.
CATALOG = [
    {"id": "theme-space", "type": "theme", "slot": "theme", "name_tr": "Uzay", "name_en": "Space", "price": 30, "preview": {"cell": "#f7f4fd", "ink": "#2a2148", "line": "#6a568f", "room": "#b39ad4"}},
    {"id": "theme-forest", "type": "theme", "slot": "theme", "name_tr": "Orman", "name_en": "Forest", "price": 30, "preview": {"cell": "#f4faf1", "ink": "#143226", "line": "#2f6a48", "room": "#7fbf86"}},
    {"id": "theme-sea", "type": "theme", "slot": "theme", "name_tr": "Deniz", "name_en": "Sea", "price": 30, "preview": {"cell": "#f3fafd", "ink": "#0e3044", "line": "#1f6f90", "room": "#6eb4d4"}},
    {"id": "theme-candy", "type": "theme", "slot": "theme", "name_tr": "Kutup Işıkları", "name_en": "Northern Lights", "price": 40, "preview": {"cell": "#f3fbf8", "ink": "#123832", "line": "#2f7a6c", "room": "#7ed0c0"}},
    {"id": "theme-night", "type": "theme", "slot": "theme", "name_tr": "Gece", "name_en": "Night", "price": 40, "preview": {"cell": "#f4f6fd", "ink": "#1c2748", "line": "#4d6294", "room": "#8aa0d4"}},
    {"id": "bg-dawn", "type": "background", "slot": "background", "name_tr": "Şafak", "name_en": "Dawn", "price": 20, "preview": {"cell": "#fff8f2", "ink": "#4a2812", "line": "#c45a28", "room": "#f0b07a"}},
    {"id": "bg-meadow", "type": "background", "slot": "background", "name_tr": "Çayır", "name_en": "Meadow", "price": 20, "preview": {"cell": "#f8fbef", "ink": "#24340e", "line": "#4f7420", "room": "#b6d36a"}},
    {"id": "bg-ink", "type": "background", "slot": "background", "name_tr": "Mürekkep", "name_en": "Ink", "price": 20, "preview": {"cell": "#fbf6fb", "ink": "#3a2044", "line": "#8a4e8c", "room": "#d7a6dc"}},
    {"id": "owl-little", "type": "owl", "slot": "collection", "name_tr": "Kukumav", "name_en": "Little Owl", "price": 15, "rarity": "common", "photo": "little.webp", "fact_tr": "Gündüz de uyanık kalır ve ağaç kovuklarına ya da taş duvarlara yuva yapar.", "fact_en": "It often stays awake by day and nests in holes in trees or stone walls.", "preview": {}},
    {"id": "owl-pygmy", "type": "owl", "slot": "collection", "name_tr": "Cüce Baykuş", "name_en": "Eurasian Pygmy Owl", "price": 18, "rarity": "common", "photo": "pygmy.webp", "fact_tr": "Boyu yaklaşık 16–17 santimetredir ve ensesinde sahte göz lekeleri vardır.", "fact_en": "It is about 16–17 centimetres long, and it has false eye-spots on the back of its head.", "preview": {}},
    {"id": "owl-short-eared", "type": "owl", "slot": "collection", "name_tr": "Kır Baykuşu", "name_en": "Short-eared Owl", "price": 18, "rarity": "common", "photo": "short-eared.webp", "fact_tr": "Kulak tüyleri çok kısadır ve açık arazide gündüz de avlanır.", "fact_en": "Its ear tufts are very short, and it also hunts by day over open ground.", "preview": {}},
    {"id": "owl-burrowing", "type": "owl", "slot": "collection", "name_tr": "Oyuk Baykuşu", "name_en": "Burrowing Owl", "price": 20, "rarity": "common", "photo": "burrowing.webp", "fact_tr": "Yuvasını yerin altına, çoğu zaman başka hayvanların kazdığı oyuklara kurar.", "fact_en": "It nests underground, often in burrows dug by other animals.", "preview": {}},
    {"id": "owl-long-eared", "type": "owl", "slot": "collection", "name_tr": "Kulaklı Orman Baykuşu", "name_en": "Long-eared Owl", "price": 20, "rarity": "common", "photo": "long-eared.webp", "fact_tr": "Başındaki uzun tüyler kulak değildir; bunlar tüy tepelikleridir.", "fact_en": "The long feathers on its head are not ears; they are feather tufts.", "preview": {}},
    {"id": "owl-barn", "type": "owl", "slot": "collection", "name_tr": "Peçeli Baykuş", "name_en": "Barn Owl", "price": 35, "rarity": "rare", "photo": "barn.webp", "fact_tr": "Yüzü kalp biçimindedir ve avını büyük ölçüde işiterek bulur.", "fact_en": "Its face is heart-shaped, and it finds prey mostly by hearing.", "preview": {}},
    {"id": "owl-barred", "type": "owl", "slot": "collection", "name_tr": "Çizgili Baykuş", "name_en": "Barred Owl", "price": 40, "rarity": "rare", "photo": "barred.webp", "fact_tr": "Göğsünde enine çizgiler vardır ve Kuzey Amerika ormanlarında yaşar.", "fact_en": "It has bars across its chest and lives in forests of North America.", "preview": {}},
    {"id": "owl-screech", "type": "owl", "slot": "collection", "name_tr": "Kızıl Baykuş", "name_en": "Eastern Screech-Owl", "price": 40, "rarity": "rare", "photo": "screech.webp", "fact_tr": "Kızıl ya da gri tüylü olabilir ve ağaç kovuklarına yuva yapar.", "fact_en": "It may be reddish or gray, and it nests in tree cavities.", "preview": {}},
    {"id": "owl-spectacled", "type": "owl", "slot": "collection", "name_tr": "Gözlüklü Baykuş", "name_en": "Spectacled Owl", "price": 45, "rarity": "rare", "photo": "spectacled.webp", "fact_tr": "Göz çevresindeki beyaz çizgiler gözlük gibi durur; Orta ve Güney Amerika ormanlarında yaşar.", "fact_en": "White marks around its eyes look like spectacles, and it lives in forests of Central and South America.", "preview": {}},
    {"id": "owl-great-horned", "type": "owl", "slot": "collection", "name_tr": "Boynuzlu Baykuş", "name_en": "Great Horned Owl", "price": 50, "rarity": "rare", "photo": "great-horned.webp", "fact_tr": "Kulak tüyleri boynuz gibi durur; Kuzey ve Güney Amerika'da yaşar.", "fact_en": "Its ear tufts look like horns, and it lives in North and South America.", "preview": {}},
    {"id": "owl-snowy", "type": "owl", "slot": "collection", "name_tr": "Kar Baykuşu", "name_en": "Snowy Owl", "price": 80, "rarity": "legendary", "photo": "snowy.webp", "fact_tr": "Kuzey kutup tundrasında yaşar ve tüyleri neredeyse bembeyazdır.", "fact_en": "It lives on the Arctic tundra, and its feathers are nearly all white.", "preview": {}},
    {"id": "owl-eagle", "type": "owl", "slot": "collection", "name_tr": "Puhu", "name_en": "Eurasian Eagle-Owl", "price": 100, "rarity": "legendary", "photo": "eagle.webp", "fact_tr": "En büyük baykuşlardan biridir; kanat açıklığı 1,5 metreyi geçebilir.", "fact_en": "It is one of the largest owls, and its wingspan can pass 1.5 metres.", "preview": {}},
]

# Katalogdan kalkan aksesuarların eski fiyatları. İade bu tutarlarla yapılır.
ACCESSORY_REFUNDS = {
    "hat-red": 15,
    "hat-wizard": 25,
    "glasses-round": 15,
    "glasses-sun": 20,
    "scarf-red": 15,
    "scarf-stripe": 20,
    "cape-red": 25,
    "cape-blue": 25,
    "crown-gold": 50,
    "crown-silver": 40,
}

_BY_ID = {item["id"]: item for item in CATALOG}


def item_by_id(item_id):
    return _BY_ID.get(item_id)


def public_item(item):
    payload = {
        "id": item["id"],
        "type": item["type"],
        "slot": item["slot"],
        "name_tr": item["name_tr"],
        "name_en": item["name_en"],
        "price": item["price"],
        "preview": item["preview"],
    }
    for key in ("photo", "fact_tr", "fact_en", "rarity"):
        if key in item:
            payload[key] = item[key]
    return payload


def owl_ids():
    return [item["id"] for item in CATALOG if item["type"] == "owl"]


def owl_progress(user_id):
    ids = owl_ids()
    if not ids:
        return 0, 0
    owned = UserItem.query.filter(UserItem.user_id == user_id, UserItem.item_id.in_(ids)).count()
    return owned, len(ids)


def owned_rows(user_id):
    return UserItem.query.filter_by(user_id=user_id).all()


def purchase(user, item_id):
    item = item_by_id(item_id)
    if item is None:
        raise ShopError("Ürün bulunamadı", 404)
    if UserItem.query.filter_by(user_id=user.id, item_id=item_id).first():
        raise ShopError("Bu ürün zaten alınmış", 409)
    if int(user.star_balance or 0) < item["price"]:
        raise ShopError("Yıldız bakiyeniz bu ürün için yetmiyor.", 402)
    user.star_balance = int(user.star_balance or 0) - item["price"]
    db.session.add(StarLedger(
        user_id=user.id,
        amount=-item["price"],
        reason="purchase",
        attempt_id=None,
    ))
    wear = item["type"] != "owl"
    row = UserItem(user_id=user.id, item_id=item_id, equipped=wear)
    if wear:
        for other in UserItem.query.filter_by(user_id=user.id, equipped=True).all():
            other_item = item_by_id(other.item_id)
            if other_item and other_item["slot"] == item["slot"]:
                other.equipped = False
    db.session.add(row)
    db.session.flush()
    from app.services.certificates import award_new

    award_new(user.id)
    return row


def refund_accessories(connection):
    """Aksesuar satırlarını siler ve ödenen yıldızları bakiyeye yazar."""
    for item_id, price in ACCESSORY_REFUNDS.items():
        found = connection.execute(
            text("SELECT id, user_id FROM user_items WHERE item_id = :item_id"),
            {"item_id": item_id},
        ).fetchall()
        for row in found:
            connection.execute(
                text("UPDATE users SET star_balance = COALESCE(star_balance, 0) + :price WHERE id = :user_id"),
                {"price": price, "user_id": row.user_id},
            )
            connection.execute(
                text(
                    "INSERT INTO star_ledger (id, user_id, amount, reason, created_at) "
                    "VALUES (:id, :user_id, :amount, 'refund', :created_at)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "user_id": row.user_id,
                    "amount": price,
                    "created_at": datetime.utcnow(),
                },
            )
            connection.execute(text("DELETE FROM user_items WHERE id = :id"), {"id": row.id})


def equip(user, item_id):
    row = UserItem.query.filter_by(user_id=user.id, item_id=item_id).first()
    if row is None:
        raise ShopError("Bu ürün hesabınızda yok.", 404)
    item = item_by_id(item_id)
    if row.equipped:
        row.equipped = False
        return row
    for other in UserItem.query.filter_by(user_id=user.id, equipped=True).all():
        other_item = item_by_id(other.item_id)
        if other_item and item and other_item["slot"] == item["slot"]:
            other.equipped = False
    row.equipped = True
    return row
