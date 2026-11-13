"""Evidence-grounded teaching materials; exports never become retrieval sources."""
from io import BytesIO
from pathlib import Path
from typing import Literal
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET
import json

from pydantic import BaseModel, ConfigDict, Field
from research.models import Query

ROOT = Path(__file__).resolve().parent


class LearningRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    investigation_id: str = Field(min_length=1, max_length=100, pattern=r'^[A-Za-z0-9_-]+$')
    audience: Literal['professor', 'undergraduate', 'graduate'] = 'professor'
    topic: str = Field(default='', max_length=500)
    notes: str = Field(default='', max_length=2000, description='Personal notes included in PDF exports.')


def generate(service, request):
    question = ('Explain this investigation for teaching: its stated purpose, experimental setup, '
                'controlled variables, measurements, reported observations and limitations. '
                'Separate objectives and requirements from completed results. '
                'Return 4 to 6 independently understandable teaching points as findings, each at most '
                '380 characters, with citations; no interpretations. Focus if specified: ' + request.topic)
    query = Query(question=question, investigation_ids=[request.investigation_id], audience=request.audience)
    matches, status = service.retrieve(query)
    if not matches:
        return {'status': status, 'message': 'No supporting context is available for this investigation.'}
    # Multiple source documents reduce dependence on a single narrow passage.
    selected, counts = [], {}
    for match in matches:
        e = match['evidence']
        if counts.get(e.document_id, 0) < 2:
            selected.append(e); counts[e.document_id] = counts.get(e.document_id, 0) + 1
        if len(selected) == 8:
            break
    answer = service._answer(question, selected, audience_preferences=query)
    if answer['status'] != 'answered':
        return answer
    points = answer['findings'] + answer['interpretations']
    if not 4 <= len(points) <= 6 or any(len(c['text']) > 420 for c in points):
        return {'status': 'unable_to_validate', 'message': 'The teaching draft did not meet the content and length requirements. Try again.'}
    return assemble(request, selected[0].investigation_name, answer)


def source_materials(service, request, *, slides=False):
    question = request.topic or 'experiment objectives setup conditions measurements observations and results'
    query = Query(question=question, investigation_ids=[request.investigation_id], audience=request.audience)
    matches, status = service.retrieve(query)
    if not matches:
        return {'status': status, 'message': 'No supporting sources matched this topic in the selected investigation.'}
    if not request.topic:
        readable = [match for match in matches
                    if len(match['evidence'].text.split()) >= 25 and '........' not in match['evidence'].text]
        matches = readable or matches
    points, citations, counts = [], [], {}
    for match in matches:
        evidence = match['evidence']
        count = counts.get(evidence.document_id, 0)
        if count == 2:
            continue
        counts[evidence.document_id] = count + 1
        text = ' '.join(evidence.text.split())
        if slides and len(text) > 380:
            text = text[:377].rsplit(' ', 1)[0] + '...'
        points.append({'text': text, 'citation_ids': [evidence.id]})
        citations.append({**evidence.model_dump(exclude={'text', 'row_data'}), 'quote': evidence.text})
        if len(points) == 4:
            break
    return assemble(request, matches[0]['evidence'].investigation_name, {
        'findings': points, 'interpretations': [], 'citations': citations,
        'limitations': ['Excerpts may describe plans, methods, or observations. Check the cited document for the test conditions and context.'],
        'quality': {'method': 'source_excerpts'},
    })


def assemble(request, name, answer):
    return {'status': 'ready', 'investigation_id': request.investigation_id,
            'title': name, 'audience': request.audience, 'topic': request.topic,
            'points': answer['findings'] + answer['interpretations'],
            'limitations': answer['limitations'], 'citations': answer['citations'],
            'quality': answer['quality'],
            'review_note': 'Review the material and cited sources before classroom use.'}


def example(request):
    if request.investigation_id != 'PSI-25' or request.topic:
        return None
    payload = json.loads((ROOT / 'bass-ii-learning.json').read_text())
    return assemble(request, 'BASS-II', payload)


def location_label(location):
    return ', '.join(f"{key.replace('_', ' ')} {value}" for key,value in location.items())


def source_label(c):
    return f"{c['title']} | {location_label(c['location'])}"



def plan(pack):
    points = pack['points']
    excerpt_deck = pack['quality'].get('method') == 'source_excerpts'
    refs = {c['id']: (i+1, c) for i,c in enumerate(pack['citations'])}
    deck_title = ' source excerpts' if excerpt_deck else ' lecture'
    result = [(pack['title'][:70] + deck_title, 'Purpose, experimental evidence and limits\nEditable teaching material', pack['review_note'], '')]
    result.append(('Learning objectives', 'Describe the reported experimental setup.\nDistinguish study objectives from observations.\nTrace a scientific claim to its source.', '', 'Suggested teaching objectives.'))
    for i in range(6):
        if i < len(points):
            c = points[i]; used = [refs[k] for k in c['citation_ids']]
            result.append((f'Source excerpt {i+1}' if excerpt_deck else f'Investigation evidence {i+1}', ' '.join(c['text'].split()), 'Sources: '+', '.join(f'[{n}]' for n,_ in used),
                           'Teaching prompt: Which source supports this point?\n'+'\n'.join(f'[{n}] {source_label(s)}\n{s.get("source_url") or ""}\n{s["quote"]}' for n,s in used)))
        else:
            result.append(('Evidence review', 'Choose one preceding point. Locate its source and identify what was measured and what was inferred.', '', 'Discussion exercise; no new scientific claim.'))
    result.append(('Evidence limits', ('\n'.join(pack['limitations']) if sum(map(len,pack['limitations'])) <= 500 else 'Read the study-specific limitations in the speaker notes and source documents.') or 'Check the original sources for study-specific limits before extending these findings to another environment.', '', '\n'.join(pack['limitations'])+'\nDo not treat textual relevance as numerical scenario matching or safety approval.'))
    result.append(('Class discussion', 'Which statements describe objectives rather than observed results?\nWhich conditions are explicitly reported together?\nWhat evidence would you need before applying a result elsewhere?', '', 'Open discussion; do not invent missing conditions.'))
    for start in (0,4):
        citations = pack['citations'][start:start+4]
        body = '\n\n'.join(f'[{i+start+1}] {c["title"][:60]} — {location_label(c['location'])[:70]}' for i,c in enumerate(citations))
        notes = '\n\n'.join(f'{source_label(c)}\n{c.get("source_url") or ""}\nSHA256: {c["content_hash"]}\n{c["quote"]}' for c in citations)
        result.append(('Source references', body, pack['review_note'], notes) if citations else ('Further study', 'Choose one source claim and inspect its original context.\nList the experimental conditions it explicitly reports.\nWrite one question that the available evidence does not answer.', 'Suggested reading activity', 'Open exercise; do not infer missing results.'))
    return result


def export_pptx(pack):
    slides = plan(pack)
    out = BytesIO()
    with ZipFile(ROOT / 'templates' / 'lecture.pptx') as original, ZipFile(out, 'w', ZIP_DEFLATED) as target:
        for item in original.infolist():
            data = original.read(item.filename)
            if item.filename.startswith(('ppt/slides/slide', 'ppt/notesSlides/notesSlide')) and item.filename.endswith('.xml'):
                import re
                number = re.search(r'(?:slide|notesSlide)(\d+)\.xml$', item.filename)
                if number:
                    title, body, footer, notes = slides[int(number[1])-1]
                    values = {'{{TITLE}}': title, '{{BODY}}': body, '{{FOOTER}}': footer, '{{NOTES}}': notes}
                    root = ET.fromstring(data)
                    if item.filename.startswith('ppt/slides/') and int(number[1]) >= 11:
                        for shape in root.iter('{http://schemas.openxmlformats.org/presentationml/2006/main}sp'):
                            if any(t.text == '{{BODY}}' for t in shape.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}t')):
                                for properties in shape.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}rPr'):
                                    properties.set('sz', '1800')
                    for t in root.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}t'):
                        if t.text in values:
                            t.text = values[t.text]
                    data = ET.tostring(root, encoding='utf-8', xml_declaration=True)
            target.writestr(item, data)
    return out.getvalue()


def export_docx(pack):
    ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    def paragraph(text, style=None):
        p = ET.Element(f'{{{ns}}}p')
        if style:
            props = ET.SubElement(p, f'{{{ns}}}pPr'); ET.SubElement(props, f'{{{ns}}}pStyle', {f'{{{ns}}}val':style})
        run = ET.SubElement(p, f'{{{ns}}}r'); ET.SubElement(run, f'{{{ns}}}t', {'{http://www.w3.org/XML/1998/namespace}space':'preserve'}).text = text
        return p
    sections = [(pack['title']+' study notes','Title'),
                ('Undergraduate guided study' if pack['audience']=='undergraduate' else 'Graduate critical reading','Subtitle'),
                ('Use these notes to understand the investigation, check each cited claim, and practise explaining its evidence. '+pack['review_note'],None),
                ('Study sequence','Heading1')]
    sequence = ('Read each point, explain it in your own words, then answer the recall prompts without looking.' if pack['audience']=='undergraduate' else
                'Read the cited methods and records. For each point, separate the observation, experimental conditions, and any assumption needed for generalization.')
    sections.append((sequence,None))
    refs = {c['id']:i+1 for i,c in enumerate(pack['citations'])}
    for i,c in enumerate(pack['points'],1):
        sections += [(f'Evidence point {i}','Heading1'), (c['text']+' '+''.join(f'[{refs[k]}]' for k in c['citation_ids']),None)]
        prompt = ('Explain this point in your own words. What source supports it?' if pack['audience']=='undergraduate' else
                  'Identify the variables and measurement method explicitly reported for this point. What is missing? Does the cited passage report a result, objective, or requirement?')
        sections += [(prompt,None),('Your notes  __________________________________________________',None)]
    sections += [('Evidence limits','Heading1')]+[(x,None) for x in (pack['limitations'] or ['Consult the original methods and limitations before applying these points to another experiment.'])]
    sections += [('Self assessment','Heading1')]
    for i,_ in enumerate(pack['points'],1):
        sections.append((f'{i}. Without looking, reconstruct evidence point {i} and identify its source. Then check the key.',None))
    sections += [('Answer key','Heading1')]
    for i,c in enumerate(pack['points'],1):
        sections.append((f'{i}. {c["text"]} '+''.join(f'[{refs[k]}]' for k in c['citation_ids']),None))
    sections += [('Source references','Heading1')]
    for i,c in enumerate(pack['citations'],1):
        sections += [(f'[{i}] {source_label(c)}',None),(c.get('source_url') or 'Source available in the investigation evidence view.',None)]
    output=BytesIO()
    with ZipFile(ROOT/'templates'/'study.docx') as original, ZipFile(output,'w',ZIP_DEFLATED) as target:
        for item in original.infolist():
            data=original.read(item.filename)
            if item.filename=='word/document.xml':
                root=ET.fromstring(data);body=root.find(f'{{{ns}}}body');sect=body.find(f'{{{ns}}}sectPr')
                for child in list(body):
                    if child is not sect: body.remove(child)
                for index,(text,style) in enumerate(sections):
                    p=paragraph(text,style)
                    if text == 'Answer key' or text.startswith(('Explain this point','Identify the variables')) or (index+1 < len(sections) and sections[index+1][0].startswith(('Explain this point','Identify the variables'))):
                        props=p.find(f'{{{ns}}}pPr')
                        if props is None:
                            props=ET.Element(f'{{{ns}}}pPr');p.insert(0,props)
                        ET.SubElement(props,f'{{{ns}}}pageBreakBefore' if text=='Answer key' else f'{{{ns}}}keepNext')
                    body.insert(len(body)-(1 if sect is not None else 0),p)
                data=ET.tostring(root,encoding='utf-8',xml_declaration=True)
            target.writestr(item,data)
    return output.getvalue()
