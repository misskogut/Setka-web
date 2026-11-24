import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('experiments/standalone-vertical-logo-v1.js', 'utf8');
const css = fs.readFileSync('experiments/standalone-vertical-logo-v1.css', 'utf8');
const globe = fs.readFileSync('experiments/standalone-vertical-logo-globe-v3.js', 'utf8');
const html = fs.readFileSync('standalone-v34-cycle-logo3d.html', 'utf8');

function mockCard(side = 'setka') {
  let rafId = 0;
  const rafs = new Map();
  const calls = [];
  const nodes = new Map();
  class Element {
    constructor(id, rect = {left: 0, top: 0, width: 390, height: 780}) {
      this.id = id;
      this._rect = rect;
      this.parentNode = null;
      this.children = [];
      this.style = {removeProperty(key) {delete this[key]}, setProperty(key, value) {this[key] = value}};
      this.attributes = {};
      this.handlers = {};
      this.classes = new Set();
      this.classList = {
        contains: c => this.classes.has(c),
        add: (...names) => names.forEach(n => this.classes.add(n)),
        remove: (...names) => names.forEach(n => this.classes.delete(n)),
        toggle: (name, force) => {
          const on = force === undefined ? !this.classes.has(name) : !!force;
          on ? this.classes.add(name) : this.classes.delete(name);
          return on;
        }
      };
      this.offsetHeight = rect.height;
      this.clientHeight = rect.height;
      this.hidden = false;
    }
    appendChild(child) {
      if(child.parentNode)child.parentNode.removeChild(child);
      this.children.push(child);
      child.parentNode = this;
      return child;
    }
    removeChild(child) {
      const i = this.children.indexOf(child);
      if(i < 0)throw Error('Not a child');
      this.children.splice(i, 1);
      child.parentNode = null;
      return child;
    }
    insertBefore(child, next) {
      if(child.parentNode)child.parentNode.removeChild(child);
      const i = this.children.indexOf(next);
      if(i < 0)throw Error('Reference child missing');
      this.children.splice(i, 0, child);
      child.parentNode = this;
    }
    get nextSibling() {
      const siblings = this.parentNode?.children || [];
      return siblings[siblings.indexOf(this) + 1] || null;
    }
    getBoundingClientRect() {
      const r = this._rect;
      return {...r, right: r.left + r.width, bottom: r.top + r.height};
    }
    setAttribute(key, value) {this.attributes[key] = String(value)}
    addEventListener(key, fn) {(this.handlers[key] ||= []).push(fn)}
    setPointerCapture() {}
  }
  const make = (id, r) => {
    const el = new Element(id, r);
    nodes.set(id, el);
    return el;
  };
  const body = make('body');
  const app = make('app', {left: 0, top: 0, width: 390, height: 760});
  const lib = make('libraryScreen');
  const game = make('gameScreen');
  const cycle = make('setkaCycleBack');
  const nav = make('st34Nav', {left: 11, top: 680, width: 368, height: 64});
  const sentinel = make('sentinel');
  const logo = make('setkaVerticalLogo');
  const card = make('setkaVerticalLogoCard', {left: 14, top: 12, width: 362, height: 740});
  const top = make('setkaVerticalGripTop');
  const bottom = make('setkaVerticalGripBottom');
  make('setkaVerticalTitleOne');
  make('setkaVerticalTitleTwo');
  body.appendChild(app); app.appendChild(lib); app.appendChild(game);
  body.appendChild(cycle);
  body.appendChild(nav);
  body.appendChild(sentinel);
  body.appendChild(logo); logo.appendChild(card);
  body.appendChild(top); body.appendChild(bottom);
  lib.classes.add('active');
  if(side === 'cycle')app.style.visibility = 'hidden';
  const document = {
    body,
    getElementById: id => nodes.get(id) || null,
    createElement: tag => new Element(tag),
    addEventListener() {}
  };
  const window = {
    SETKA_CYCLE_LAB: {getSide: () => side},
    SETKA_SOLID_WORDMARK: {render: v => calls.push(v)},
    addEventListener() {}
  };
  const context = {
    document, window,
    location: {hash: '', pathname: '/Setka-web/standalone-v34-cycle-logo3d.html', search: ''},
    history: {state: null, replaceState() {}},
    MutationObserver: class {observe() {}},
    requestAnimationFrame: fn => {rafs.set(++rafId, fn); return rafId},
    cancelAnimationFrame: id => rafs.delete(id),
    innerHeight: 780,
    console
  };
  vm.runInNewContext(source, context, {filename: 'standalone-vertical-logo-v1.js'});
  function advance(now) {
    const next = rafs.entries().next().value;
    if(!next)return;
    rafs.delete(next[0]);
    next[1](now);
  }
  return {window, body, nav, app, cycle, logo, card, sentinel, calls, advance};
}

test('the dock joins the SETKA face and returns home after both flip directions', () => {
  const m = mockCard();
  const api = m.window.SETKA_VERTICAL_LOGO_LAB;
  assert.equal(m.nav.parentNode, m.body);
  assert.equal(api.flip(true), true);
  assert.equal(m.nav.parentNode, m.app);
  assert.equal(m.nav.style.top, '680.00px');
  assert.equal(m.nav.style.bottom, 'auto');
  m.advance(0); m.advance(170); m.advance(1000);
  assert.equal(m.nav.parentNode, m.body);
  assert.equal(m.nav.nextSibling, m.sentinel);
  assert.equal(m.nav.style.top, undefined);
  assert.equal(m.nav.style.bottom, undefined);
  assert.equal(m.body.classList.contains('setka-vlogo-side'), true);
  assert.equal(m.app.style.visibility, 'hidden');
  assert.equal(api.flip(false), true);
  assert.equal(m.nav.parentNode, m.app);
  m.advance(1100); m.advance(1500); m.advance(2000);
  assert.equal(m.nav.parentNode, m.body);
  assert.equal(m.body.classList.contains('setka-vlogo-side'), false);
  assert.equal(m.app.style.visibility, undefined);
  assert.equal(m.nav.nextSibling, m.sentinel);
  assert.ok(m.calls.some(c => c.visible === true && Math.abs(c.angle) > 50 && Math.abs(c.angle) < 130),
    '3D globe must remain drawn through mid-flip');
});

test('calendar side keeps its original front visibility when returning from logo', () => {
  const m = mockCard('cycle');
  const api = m.window.SETKA_VERTICAL_LOGO_LAB;
  assert.equal(api.flip(true), true);
  assert.equal(m.nav.parentNode, m.cycle);
  m.advance(0); m.advance(700);
  assert.equal(m.nav.parentNode, m.body);
  assert.equal(api.flip(false), true);
  assert.equal(m.nav.parentNode, m.cycle);
  m.advance(900); m.advance(1700);
  assert.equal(m.nav.parentNode, m.body);
  assert.equal(m.app.style.visibility, 'hidden');
});

test('logo spans the combined front-card-and-dock height but has no dock of its own', () => {
  assert.match(html, /--setka-vlogo-card-bottom:calc\(8px \+ env\(safe-area-inset-bottom, 0px\)/);
  assert.match(css, /\.setka-vlogo-card\s*\{[^}]*bottom:var\(--setka-vlogo-card-bottom/);
  assert.match(css, /setka-vlogo-side:not\(\.setka-vlogo-flip-active\) #st34Nav\s*\{display:none!important\}/);
  assert.match(css, /setka-vlogo-flip-active #app\s*\{overflow:visible!important\}/);
  assert.match(globe, /var\(--setka-vlogo-card-bottom/);
  assert.match(source, /const unrotatedHeight=card\.offsetHeight/);
  assert.match(source, /renderSolid\(\{angle:direction\*180\*\(1-p\),visible:true\}\)/);
});

test('approved card has one centered halo and stationary thin caption at 94 percent',()=>{
 const bg=css.match(/\.setka-vlogo-card\s*\{([^}]+)\}/)[1];
 assert.equal((bg.match(/radial-gradient/g)||[]).length,1);
 assert.match(bg,/at 50% 45%,rgba\(141,51,208,\.38\)/);
 assert.match(css,/\.setka-vlogo-card::after\s*\{content:none;\}/);
 assert.match(css,/\.setka-vlogo-caption\s*\{[^}]*top:94%/);
 assert.match(css,/\.setka-vlogo-caption\s*\{[^}]*font-size:8px;font-weight:200/);
 assert.match(css,/\.setka-vlogo-caption\s*\{[^}]*letter-spacing:3\.2px;color:#e0cce9;opacity:\.82/);
 assert.match(html,/<span class="setka-vlogo-caption">АНТИСТРЕСС ТРЕКЕР<\/span>/);
 assert.doesNotMatch(html,/<span class="setka-vlogo-microcopy"[^>]*>SETKA<\/span>/);
 assert.match(html,/standalone-vertical-logo-v1\.css\?v=20261124-card-layout-45-94-floating-v4/);
});
