import json
import pytest
from app.services.tournament import make_question
from app.models import PuzzleAttempt
from app.extensions import db
from tests.helpers import auth_headers
from pathlib import Path

@pytest.mark.parametrize('slug',list(json.loads((Path(__file__).parent/'fixtures/rounds.json').read_text()).keys()))
def test_booklet_questions_have_one_private_answer(slug):
    data=json.loads((Path(__file__).parent/'fixtures/rounds.json').read_text())[slug]
    question,answer=make_question(slug,data['puzzle'],{'solution':data['answer']})
    assert 0<=answer<len(question['options'])
    assert len({x['tr'] for x in question['options']})==len(question['options'])
    assert 'correct' not in question
    assert all(0<=r<question['rows'] and 0<=c<question['cols'] for r,c in question['cells'])

def test_tournament_submission_is_once_and_not_a_normal_score(client, student):
    headers=auth_headers(student['token'])
    res=client.post('/api/puzzles',json={'slug':'sudoku','mode':'tournament'},headers=headers)
    assert res.status_code==201
    data=res.get_json();question=data['puzzle']['tournament']
    assert 'correct' not in question
    attempt=db.session.get(PuzzleAttempt,data['id']);correct=attempt.proof_puzzle['tournament']['correct']
    assert client.post('/api/scores',json={'attempt_id':data['id'],'answer':None},headers=headers).status_code==400
    assert client.post(f"/api/puzzles/{data['id']}/cell",json={},headers=headers).status_code==400
    result=client.post(f"/api/puzzles/{data['id']}/check",json={'answer':{'option':correct}},headers=headers)
    assert result.get_json()['correct'] is True
    assert 'stars' not in result.get_json()
    assert client.post(f"/api/puzzles/{data['id']}/check",json={'answer':{'option':correct}},headers=headers).status_code==404
