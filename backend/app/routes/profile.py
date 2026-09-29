from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Game, PersonalBest, Score, User
from app.services.character import RANKS, next_stage, rank_for, stage_for
from app.services.shop import item_by_id, owl_progress, owned_rows

profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")


def _counts(user_id):
    games = {game.id: game for game in Game.query.all()}
    counts = {game.slug: 0 for game in games.values()}
    total = 0
    for score in Score.query.filter_by(user_id=user_id, completed=True).all():
        game = games.get(score.game_id)
        if game is None:
            continue
        counts[game.slug] = counts.get(game.slug, 0) + 1
        total += 1
    return counts, total


def snapshot(user):
    counts, total = _counts(user.id)
    titles = []
    for slug, solved in counts.items():
        rank = rank_for(solved)
        if rank:
            titles.append({"game_slug": slug, "rank": rank, "solved": solved})
    records = [
        {
            "game_slug": row.game_slug,
            "difficulty": row.difficulty,
            "best_seconds": row.best_seconds,
        }
        for row in PersonalBest.query.filter_by(user_id=user.id).order_by(PersonalBest.game_slug).all()
    ]
    owned_count, total_count = owl_progress(user.id)
    equipped = []
    for row in owned_rows(user.id):
        if not row.equipped:
            continue
        item = item_by_id(row.item_id)
        if item:
            equipped.append({"id": item["id"], "slot": item["slot"], "preview": item["preview"]})
    return {
        "full_name": user.full_name,
        "star_balance": int(user.star_balance or 0),
        "solved": total,
        "stage": stage_for(total),
        "next": next_stage(total),
        "active_title": user.active_title,
        "titles": titles,
        "records": records,
        "equipped": equipped,
        "ranks": [{"rank": rank, "need": need} for rank, need in RANKS],
        "collection": {"owned": owned_count, "total": total_count},
    }


@profile_bp.get("")
@jwt_required()
def show():
    user = db.session.get(User, get_jwt_identity())
    if user is None:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404
    return jsonify(snapshot(user))


@profile_bp.post("/title")
@jwt_required()
def choose_title():
    user = db.session.get(User, get_jwt_identity())
    if user is None:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404
    data = request.get_json(force=True) or {}
    chosen = data.get("title")
    if not chosen:
        user.active_title = None
        db.session.commit()
        return jsonify(snapshot(user))
    counts, _total = _counts(user.id)
    slug, _, rank = str(chosen).partition(":")
    if rank_for(counts.get(slug, 0)) is None or rank not in {key for key, _need in RANKS}:
        return jsonify({"error": "Bu unvan henüz kazanılmadı."}), 400
    earned = rank_for(counts.get(slug, 0))
    order = [key for key, _need in RANKS]
    if order.index(rank) > order.index(earned):
        return jsonify({"error": "Bu unvan henüz kazanılmadı."}), 400
    user.active_title = f"{slug}:{rank}"
    db.session.commit()
    return jsonify(snapshot(user))
