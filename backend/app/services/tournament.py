"""Booklet-style questions derived privately from generated puzzle solutions."""
import random


def make_question(slug, public, proof):
    rng = random.SystemRandom()
    solution = proof['solution']
    cells = []
    rows = cols = 3
    pool = None
    if isinstance(solution, list) and isinstance(solution[0][0], (int, type(None))):
        rows, cols = len(solution), len(solution[0])
        candidates = [(r,c) for r in range(rows) for c in range(cols) if solution[r][c] is not None]
        cells = rng.sample(candidates, min(3,len(candidates)))
        correct = sum(solution[r][c] for r,c in cells)
        tr, en = 'İşaretli karelerdeki sayıların toplamı kaçtır? Boş kalan kareleri 0 sayınız.', 'What is the sum in the marked cells? Count empty cells as 0.'
    elif slug in ('colours','metaforms'):
        grid = solution.get('grid') if isinstance(solution,dict) else solution
        rows, cols = len(grid), len(grid[0]); r,c=rng.randrange(rows),rng.randrange(cols);cells=[(r,c)]
        colors={'red':'Kırmızı','blue':'Mavi','yellow':'Sarı','green':'Yeşil','black':'Siyah','orange':'Turuncu','purple':'Mor','pink':'Pembe','gray':'Gri'}
        shapes={'circle':'daire','square':'kare','triangle':'üçgen'}
        def label(p): return (colors[p['color']]+' '+shapes[p['shape']],p['color']+' '+p['shape'])
        correct=label(grid[r][c]);pool=[label(p) for line in grid for p in line]
        tr,en='İşaretli kareye hangi parça gelir?','Which piece belongs in the marked cell?'
    elif slug in ('yildiz-savaslari','kare-karalamaca','amiral-batti'):
        rows=public.get('rows') or public.get('size') or len(public.get('regionGrid') or public.get('rowClues'));cols=public.get('cols') or rows
        cells=[(r,r) for r in range(min(rows,cols))]
        occupied=set(solution['cells']);correct=sum(f'{r}-{c}' in occupied for r,c in cells)
        tr,en='İşaretli köşegendeki karelerin kaçında yıldız, karalama veya gemi parçası bulunur?','How many marked diagonal cells contain a star, shading or ship?'
    elif slug=='sihirli-piramit':
        rows=len(public['rows']);cols=rows
        selected=sorted(rng.sample(range(rows),min(2,rows)))
        cells=[(r,c) for r in selected for c in range(r+1)]
        correct=sum(public['rows'][r][solution['path'][r]] for r in selected)
        tr,en='İşaretli sıralarda yolun geçtiği sayıların toplamı kaçtır?','What is the sum of the path numbers in the marked rows?'
    elif slug=='patika':
        rows,cols=public['rows'],public['cols'];r=rng.randrange(rows);cells=[(r,c) for c in range(cols)]
        directions={}
        for edge in solution['edges']:
            a,b=edge.split('|');ar,ac=map(int,a.split('-'));br,bc=map(int,b.split('-'))
            directions.setdefault(a,set()).add('h' if ar==br else 'v');directions.setdefault(b,set()).add('h' if ar==br else 'v')
        correct=sum(len(directions.get(f'{r}-{c}',set()))==2 for c in range(cols))
        tr,en='İşaretli satırda patika kaç karede dönüş yapar?','In how many marked-row cells does the path turn?'
    elif slug=='cit':
        rows=cols=public.get('size') or len(public['clues']);r=rng.randrange(rows);cells=[(r,c) for c in range(cols)]
        correct=sum(solution['horizontal'][r])
        tr,en='İşaretli satırdaki hücrelerin üst kenarlarından kaçı çizilir?','How many top edges of the marked row are drawn?'
    elif slug=='abc-baglama':
        rows,cols=public['rows'],public['cols'];letter=rng.choice(list(solution['paths']));cell=rng.choice(solution['paths'][letter]);cells=[tuple(map(int,cell.split('-')))];correct=(letter,letter);pool=[(x,x) for x in solution['paths']]
        tr,en='İşaretli kareden hangi harfin yolu geçer?','Which letter path passes through the marked cell?'
    elif slug=='pentominolar':
        region=[tuple(map(int,x.split('-'))) for x in public['region']];rows=public.get('rows') or max(r for r,c in region)+1;cols=public.get('cols') or max(c for r,c in region)+1;piece=rng.choice(solution['placements']);cells=[tuple(map(int,rng.choice(piece['cells']).split('-')))];correct=(piece['name'],piece['name']);pool=[(p,p) for p in public['pieces']]
        tr,en='İşaretli kareyi hangi parça örter?','Which piece covers the marked cell?'
    else:
        raise ValueError('Unsupported tournament puzzle')
    if pool is None:
        values={correct}
        while len(values)<4: values.add(max(0,correct+rng.choice([-5,-4,-3,-2,-1,1,2,3,4,5])))
        pool=[(str(v),str(v)) for v in values];correct=(str(correct),str(correct))
    else:
        pool=list(dict.fromkeys(pool));others=[p for p in pool if p!=correct];rng.shuffle(others);pool=[correct]+others[:3]
    rng.shuffle(pool)
    return {'rows':rows,'cols':cols,'cells':cells,'text':{'tr':tr,'en':en},'options':[{'tr':p[0],'en':p[1]} for p in pool]}, pool.index(correct)
