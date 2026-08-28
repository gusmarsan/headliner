from pathlib import Path

path = Path('index.html')
html = path.read_text(encoding='utf-8')
old = "let likely=ATTRS.map(([k])=>({k,v:state.cpu.deck[0]?.[k]||0})).sort((a,b)=>b.v-a.v);"
new = "let likely=ATTRS.map(([k])=>({k,v:effective(state.currentCpu,k)})).sort((a,b)=>b.v-a.v);"
count = html.count(old)
if count != 1:
    raise SystemExit(f'Expected exactly one CPU attribute selector target, found {count}')
html = html.replace(old, new, 1)
path.write_text(html, encoding='utf-8')

# Isolated behavior check: the same effective() logic used to resolve battles
# must also determine the CPU ranking. Kraftwerk is the clearest case:
# innovation 100 + power 10 = 110.
def effective(card, attr):
    value = card[attr]
    power = card.get('power')
    if power and power['attr'] == attr:
        value += power['boost']
    return value

kraftwerk = {
    'influence': 100,
    'success': 85,
    'longevity': 99,
    'innovation': 100,
    'prestige': 100,
    'power': {'attr': 'innovation', 'boost': 10},
}
assert effective(kraftwerk, 'innovation') == 110
assert effective(kraftwerk, 'prestige') == 100

patched = path.read_text(encoding='utf-8')
assert "v:effective(state.currentCpu,k)" in patched
assert "v:state.cpu.deck[0]?.[k]||0" not in patched
