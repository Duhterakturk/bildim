from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import User
from app.api_error import fail
from app.services.shop import CATALOG, ShopError, equip, owned_rows, public_item, purchase

shop_bp = Blueprint("shop", __name__, url_prefix="/api/shop")


def _state(user):
    owned = {row.item_id: row.equipped for row in owned_rows(user.id)}
    items = []
    for item in CATALOG:
        payload = public_item(item)
        payload["owned"] = item["id"] in owned
        payload["equipped"] = bool(owned.get(item["id"]))
        items.append(payload)
    return {"star_balance": int(user.star_balance or 0), "items": items}


@shop_bp.get("")
@jwt_required()
def catalog():
    user = db.session.get(User, get_jwt_identity())
    if user is None:
        return fail("user_missing", "Kullanıcı bulunamadı", 404)
    return jsonify(_state(user))


@shop_bp.post("/buy")
@jwt_required()
def buy():
    user = db.session.get(User, get_jwt_identity())
    if user is None:
        return fail("user_missing", "Kullanıcı bulunamadı", 404)
    data = request.get_json(force=True) or {}
    try:
        purchase(user, data.get("item_id"))
        db.session.commit()
    except ShopError as exc:
        db.session.rollback()
        return fail(getattr(exc, "code", "shop_failed"), str(exc), exc.status)
    except IntegrityError:
        db.session.rollback()
        return fail("shop_owned", "Bu ürün zaten hesabınızda.", 409)
    return jsonify(_state(user))


@shop_bp.post("/equip")
@jwt_required()
def wear():
    user = db.session.get(User, get_jwt_identity())
    if user is None:
        return fail("user_missing", "Kullanıcı bulunamadı", 404)
    data = request.get_json(force=True) or {}
    try:
        equip(user, data.get("item_id"))
        db.session.commit()
    except ShopError as exc:
        db.session.rollback()
        return fail(getattr(exc, "code", "shop_failed"), str(exc), exc.status)
    return jsonify(_state(user))
