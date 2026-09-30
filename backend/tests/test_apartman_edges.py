import copy,json
from pathlib import Path
import pytest
from app.services.grading import _grade_apartman,GradeError

@pytest.mark.parametrize('difficulty',['easy','medium','hard'])
def test_apartman_blank_board_and_optional_edges(difficulty):
    row=json.loads((Path(__file__).parent/'fixtures/rounds.json').read_text(encoding='utf-8'))['apartman']
    puzzle=copy.deepcopy(row['puzzle']); puzzle['givens']=[[0]*4 for _ in range(4)]
    puzzle['clues']['top'][0]=0
    _grade_apartman(difficulty,puzzle,row['answer'])
    wrong=copy.deepcopy(row['answer']); wrong[0][0]=wrong[0][0]%4+1
    with pytest.raises(GradeError): _grade_apartman(difficulty,puzzle,wrong)
    puzzle['clues']['left'][0]=5
    with pytest.raises(GradeError): _grade_apartman(difficulty,puzzle,row['answer'])
