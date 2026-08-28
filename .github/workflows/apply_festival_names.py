from pathlib import Path

path = Path('index.html')
html = path.read_text(encoding='utf-8')
old = "function festivalName(head){const gs=head.map(c=>c?.group).filter(Boolean);const names=head.map(c=>c?.name||'').join(' ');let A=[],B=[];if(gs.includes('electronic')){A.push('Electric','Neon','Pulse','Voltage');B.push('Transmission','Frequency','Riot','Circuit')}if(gs.includes('metal')){A.push('Iron','Black','Thunder','Heavy');B.push('Temple','Rising','Storm','Assembly')}if(gs.includes('punk')){A.push('Midnight','Static','No Future','Velvet');B.push('Riot','Transmission','Parade','Assembly')}if(gs.includes('alt')){A.push('Pacific','Velvet','Electric','Sunset','Satellite');B.push('Noise','Weekend','Fields','Sessions','Garden')}if(gs.includes('classic')){A.push('Golden','Royal','High Voltage','Starlight');B.push('Park','Sound','Summit','Gathering')}if(!A.length)A=['Electric'];if(!B.length)B=['Weekend'];if(/Joy Division|The Cure|Depeche Mode/.test(names)){A.push('Midnight');B.push('Transmission')}if(/Nirvana|Pearl Jam|Soundgarden/.test(names)){A.push('Pacific');B.push('Noise')}if(/Chemical|Prodigy|New Order/.test(names)){A.push('Neon');B.push('Riot')}return A[Math.floor(Math.random()*A.length)]+' '+B[Math.floor(Math.random()*B.length)]}"
new = r"""function festivalName(head){
 const cards=head.filter(Boolean),groups=new Set(cards.map(c=>c.group)),names=cards.map(c=>c.name).join(' ');
 const pick=list=>list[Math.floor(Math.random()*list.length)];
 const first=['Velvet','Psychic','Lunar','Plastic','Honey','Chromatic','Electric','Soft','Golden','Cosmic','Satellite','Invisible'];
 const middle=['Nervous System','Peach','Ghost','Dopamine','Mirage','Animal','Fever Dream','Geometry','Sugar','Moon','Heart','Static'];
 const endings=['Carnival','Ceremony','Society','Parade','Picnic','Ball','Assembly','Communion','Jubilee','Orchestra','Ritual','Transmission'];
 const add=(target,items)=>target.push(...items);
 if(groups.has('electronic')){add(first,['Neon','Laser','Chrome','Synthetic','Digital']);add(middle,['Circuit','Frequency','Signal','Voltage','Pixel']);add(endings,['Broadcast','Machine','Transmission'])}
 if(groups.has('metal')){add(first,['Iron','Black','Thunder','Ashen','Molten']);add(middle,['Cathedral','Furnace','Lightning','Temple','Ritual']);add(endings,['Mass','Assembly','Ceremony'])}
 if(groups.has('punk')){add(first,['Static','Acid','Broken','Midnight','Cheap']);add(middle,['Panic','Riot','Noise','Switchblade','Revolt']);add(endings,['Parade','Club','Assembly'])}
 if(groups.has('alt')){add(first,['Velvet','Psychic','Pacific','Sunset','Lunar']);add(middle,['Garden','Mirage','Cinema','Dream','Weather']);add(endings,['Picnic','Society','Carnival'])}
 if(groups.has('classic')){add(first,['Golden','Solar','Royal','Starlight','Kaleidoscopic']);add(middle,['Ballroom','Rainbow','Comet','Glass','Jubilee']);add(endings,['Ball','Gathering','Orchestra'])}
 if(/Joy Division|The Cure|Depeche Mode|Siouxsie/.test(names)){add(first,['Velvet','Midnight','Pale','Phantom']);add(middle,['Ghost','Nervous System','Moon','Shadow'])}
 if(/Nirvana|Pearl Jam|Soundgarden|Alice in Chains/.test(names)){add(first,['Pacific','Rust','Honey','Rain']);add(middle,['Static','Weather','Fever Dream','Noise'])}
 if(/Chemical Brothers|The Prodigy|New Order|Daft Punk|Aphex Twin|LCD Soundsystem/.test(names)){add(first,['Neon','Chrome','Laser','Synthetic']);add(middle,['Dopamine','Circuit','Frequency','Animal'])}
 if(/David Bowie|Talking Heads|Radiohead|Sonic Youth|Pixies/.test(names)){add(first,['Psychic','Alien','Invisible','Chromatic']);add(middle,['Geometry','Satellite','Cinema','Nervous System'])}
 if(/Beatles|Pink Floyd|The Doors|Led Zeppelin/.test(names)){add(first,['Cosmic','Solar','Kaleidoscopic','Golden']);add(middle,['Comet','Glass','Moon','Mirage'])}
 const roll=Math.random();
 if(roll<.34)return `${pick(first)} ${pick(middle)}`;
 if(roll<.78)return `${pick(first)} ${pick(middle)} ${pick(endings)}`;
 return `${pick(middle)} ${pick(endings)}`;
}"""

count = html.count(old)
if count != 1:
    raise SystemExit(f'Expected exactly one festivalName target, found {count}')
html = html.replace(old, new, 1)
path.write_text(html, encoding='utf-8')

assert 'const name=festivalName(winnerHead)' in html
assert "const first=['Velvet','Psychic'" in html
assert "const endings=['Carnival','Ceremony'" in html
print('Festival-name generator patched successfully.')
