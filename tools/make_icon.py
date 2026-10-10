#!/usr/bin/env python3
"""Generate the Sideline Status icon SVGs (football on a night field + medical cross badge).
Variants: icon.svg (rounded, 'any'), icon-full.svg (full-bleed, apple/og), icon-maskable.svg (content in 80% safe zone), icon-small.svg (favicon)."""
DEFS='''<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1f3a"/><stop offset=".42" stop-color="#11402a"/><stop offset="1" stop-color="#1b7a3c"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".05" r=".75"><stop offset="0" stop-color="#ffffff" stop-opacity=".28"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<linearGradient id="ball" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8662c"/><stop offset=".55" stop-color="#8a4318"/><stop offset="1" stop-color="#5c2a0d"/></linearGradient>
<radialGradient id="badge" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff4d4d"/><stop offset="1" stop-color="#c8102e"/></radialGradient>
<clipPath id="bc"><path d="M86,256 C140,120 372,120 426,256 C372,392 140,392 86,256Z"/></clipPath>
<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".45"/></filter>
</defs>'''
def field(lines=True):
    s='<rect width="512" height="512" fill="url(#bg)"/>'
    if lines:
        # perspective yard lines on the lower "field"
        for i,x in enumerate([-120,40,200,360,520,680]):
            s+=f'<path d="M{256+(x-256)*0.45:.0f},250 L{x:.0f},512" stroke="#fff" stroke-opacity=".16" stroke-width="6"/>'
        s+='<path d="M0,250 H512" stroke="#fff" stroke-opacity=".10" stroke-width="3"/>'
    s+='<rect width="512" height="512" fill="url(#glow)"/>'
    return s
def ball(stripes=True):
    s='<g filter="url(#sh)"><path d="M86,256 C140,120 372,120 426,256 C372,392 140,392 86,256Z" fill="url(#ball)" stroke="#3a1906" stroke-width="8"/></g>'
    s+='<g clip-path="url(#bc)">'
    if stripes:
        s+='<path d="M150,160 Q128,256 150,352" stroke="#fff" stroke-width="16" fill="none"/><path d="M362,160 Q384,256 362,352" stroke="#fff" stroke-width="16" fill="none"/>'
    s+='<ellipse cx="236" cy="200" rx="120" ry="34" fill="#fff" opacity=".16"/></g>'
    s+='<path d="M86,256 C140,120 372,120 426,256 C372,392 140,392 86,256Z" fill="none" stroke="#3a1906" stroke-width="8"/>'
    s+='<g stroke="#fff" stroke-linecap="round"><path d="M188,256 H324" stroke-width="13"/>'
    for x in (204,230,256,282,308): s+=f'<path d="M{x},234 V278" stroke-width="11"/>'
    s+='</g>'
    return s
def badge(cx=388,cy=388,r=74):
    a=r*0.52; w=r*0.36
    return (f'<circle cx="{cx}" cy="{cy}" r="{r+9}" fill="#fff"/><circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#badge)"/>'
            f'<rect x="{cx-w/2}" y="{cy-a}" width="{w}" height="{2*a}" rx="{w*0.18}" fill="#fff"/>'
            f'<rect x="{cx-a}" y="{cy-w/2}" width="{2*a}" height="{w}" rx="{w*0.18}" fill="#fff"/>')
def content(small=False):
    if small:
        return f'<g transform="translate(236 226) rotate(-35) scale(1.32) translate(-256 -256)">{ball(False)}</g>'+badge(398,398,100)
    return f'<g transform="translate(244 232) rotate(-35) scale(.97) translate(-256 -256)">{ball()}</g>'+badge()
def svg(body,round_=False):
    clip='<clipPath id="rr"><rect width="512" height="512" rx="112"/></clipPath>' if round_ else ''
    inner=f'<g clip-path="url(#rr)">{body}</g>' if round_ else body
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">{DEFS.replace("</defs>",clip+"</defs>")}{inner}</svg>\n'
import os
os.chdir(os.path.join(os.path.dirname(__file__),'..'))
open('icon.svg','w').write(svg(field()+content(),True))
open('/tmp/icn/full.svg','w').write(svg(field()+content()))
open('/tmp/icn/mask.svg','w').write(svg(field()+f'<g transform="translate(256 256) scale(.8) translate(-256 -256)">{content()}</g>'))
open('/tmp/icn/small.svg','w').write(svg(field(False)+content(True),True))
print('ok')
