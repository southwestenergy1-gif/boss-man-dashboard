/* Claudio Buddy — the little orange pixel critter for the Southwest CRM.
   Office (house team) only — the CRM injects this script just for them.
   Rebuilt 2026-07-02 (owner: "keep him orange, smaller on phones, not all over the place,
   tap opens his chat"): SAME orange 8-bit critter, but now he stays PARKED in one corner
   (no roaming across the screen, no soccer juggling, no random pop-up quips), he's smaller
   on phones, and a tap opens Claudio's DM directly. Original wandering/juggling retired.
   Controllable: window.claudioBuddy.start() / .destroy(). Safe to remove entirely:
   delete this file and the mountClaudioBuddy() call in crm.html. */
(function () {
  var CLAUDIO_ID = '78de958c-aa36-455e-9d4d-f1cf1647f714';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = ''
    /* Parked bottom-LEFT so he never collides with the blue chat FAB (bottom-right) or the tab bar. */
    + '#cl-buddy{position:fixed;left:16px;bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:40;'
    + 'width:54px;height:48px;cursor:pointer;opacity:0;transform:translateY(6px);'
    + 'transition:opacity .3s ease, transform .2s ease;-webkit-tap-highlight-color:transparent}'
    + '#cl-buddy.cl-in{opacity:1;transform:translateY(0)}'
    + '#cl-buddy.cl-gone{opacity:0;pointer-events:none}'
    + '#cl-buddy svg.cl-body{width:54px;height:44px;display:block;margin:0 auto;image-rendering:pixelated;'
    + 'filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))}'
    + '#cl-buddy:active{transform:scale(.92)}'
    /* gentle idle bob only — subtle, not attention-grabbing */
    + '#cl-buddy.cl-idle svg.cl-body{animation:cl-bob 4.5s ease-in-out infinite}'
    + '@keyframes cl-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}'
    /* one-time hop (e.g. new reply from Claudio) — optional, via .markUnread()/hop */
    + '#cl-buddy.cl-hop svg.cl-body{animation:cl-hop .5s ease}'
    + '@keyframes cl-hop{0%,100%{transform:translateY(0)}40%{transform:translateY(-13px)}}'
    /* eyes blink */
    + '#cl-eyes{transition:transform .1s ease;transform-box:fill-box;transform-origin:center}'
    + '#cl-buddy.cl-blink #cl-eyes{transform:scaleY(.12)}'
    /* unread dot */
    + '#cl-buddy .cl-dot{position:absolute;top:-3px;right:2px;width:12px;height:12px;border-radius:50%;'
    + 'background:#ff4d4f;border:2px solid #fff;display:none}'
    + '#cl-buddy.cl-unread .cl-dot{display:block}'
    + '.cl-tip{position:absolute;left:50%;bottom:56px;transform:translateX(-50%) translateY(4px);'
    + 'background:#15171d;color:#fff;font:600 12px system-ui,-apple-system,Segoe UI,sans-serif;white-space:nowrap;'
    + 'padding:5px 10px;border-radius:8px;opacity:0;transition:opacity .16s,transform .16s;pointer-events:none;'
    + 'box-shadow:0 4px 14px rgba(0,0,0,.22)}'
    + '.cl-tip.show{opacity:1;transform:translateX(-50%) translateY(0)}'
    + '.cl-tip:after{content:"";position:absolute;bottom:-4px;left:50%;margin-left:-4px;'
    + 'border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid #15171d}'
    /* smaller + clear of the bottom tab bar on phones */
    + '@media(max-width:880px){#cl-buddy{left:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));width:42px;height:38px}'
    + '#cl-buddy svg.cl-body{width:42px;height:34px}.cl-tip{display:none}}';

  /* Orange 8-bit critter — same guy, glowed up: 3 orange tones (light top → body → deep bottom),
     rounder silhouette, and a white shine in each eye. Still unmistakably the orange fella. */
  var LIGHT = '#E68A5A', BODY = '#C76B4C', DARK = '#A5502F', EYE = '#22140C';
  var critter = ''
    + '<svg class="cl-body" viewBox="0 0 16 13" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    /* ears — lit tips */
    + '<rect x="5" y="0" width="2" height="1" fill="' + LIGHT + '"/>'
    + '<rect x="5" y="1" width="2" height="1" fill="' + BODY + '"/>'
    + '<rect x="9" y="0" width="2" height="1" fill="' + LIGHT + '"/>'
    + '<rect x="9" y="1" width="2" height="1" fill="' + BODY + '"/>'
    /* head — top highlight band */
    + '<rect x="3" y="2" width="10" height="1" fill="' + LIGHT + '"/>'
    + '<rect x="2" y="3" width="12" height="1" fill="' + BODY + '"/>'
    /* body */
    + '<rect x="1" y="4" width="14" height="4" fill="' + BODY + '"/>'
    /* bottom — shadow tone + rounded base */
    + '<rect x="2" y="8" width="12" height="1" fill="' + DARK + '"/>'
    + '<rect x="3" y="9" width="10" height="1" fill="' + DARK + '"/>'
    /* little feet */
    + '<rect x="3" y="10" width="2" height="1" fill="' + DARK + '"/>'
    + '<rect x="7" y="10" width="2" height="1" fill="' + DARK + '"/>'
    + '<rect x="11" y="10" width="2" height="1" fill="' + DARK + '"/>'
    /* eyes + shine (shine inside the group so it blinks too) */
    + '<g id="cl-eyes"><rect x="4" y="4" width="2" height="3" fill="' + EYE + '"/>'
    + '<rect x="10" y="4" width="2" height="3" fill="' + EYE + '"/>'
    + '<rect x="4" y="4" width="1" height="1" fill="#fff"/>'
    + '<rect x="10" y="4" width="1" height="1" fill="#fff"/></g>'
    + '</svg>';

  var el = null, styleEl = null, tip = null, alive = false, tipT = null, blinkT = null;

  function say(t, ms){ if(!tip) return; tip.textContent=t; tip.classList.add('show'); clearTimeout(tipT);
    tipT=setTimeout(function(){ if(tip) tip.classList.remove('show'); }, ms||1400); }

  /* Tap → open Claudio's DM directly (route straight to his thread; fall back to the Messages page). */
  function open(){
    if(el){ el.classList.remove('cl-unread'); el.classList.add('cl-hop'); setTimeout(function(){ if(el) el.classList.remove('cl-hop'); },520); }
    try { window.__msgWantConvo = { kind:'dm', id: CLAUDIO_ID }; } catch(e){}
    try { location.hash = '#/messages/dm/' + CLAUDIO_ID; } catch(e){}
    setTimeout(function(){ if (typeof window.goMessages === 'function') { try { window.goMessages(); } catch(e){} } }, 60);
  }

  function start(){
    if(el) return;   // idempotent
    styleEl=document.createElement('style'); styleEl.textContent=css; document.head.appendChild(styleEl);
    el=document.createElement('div'); el.id='cl-buddy'; el.setAttribute('role','button');
    el.setAttribute('aria-label','Open chat with Claudio'); el.setAttribute('tabindex','0');
    el.innerHTML = critter + '<span class="cl-dot"></span><span class="cl-tip" id="cl-tip"></span>';
    document.body.appendChild(el);
    tip=document.getElementById('cl-tip');
    el.addEventListener('click', open);
    el.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
    el.addEventListener('mouseenter', function(){ say('Chat with Claudio'); });
    alive=true;
    requestAnimationFrame(function(){ if(el) el.classList.add('cl-in'); });   // fade in, in place
    if(reduce) return;
    el.classList.add('cl-idle');
    blinkT=setInterval(function(){ if(!el) return; el.classList.add('cl-blink'); setTimeout(function(){ if(el) el.classList.remove('cl-blink'); },130); }, 3200 + Math.floor(Math.random()*1600));
  }

  function markUnread(on){ if(el) el.classList.toggle('cl-unread', on !== false); }
  function destroy(){
    alive=false;
    if(tipT){ clearTimeout(tipT); tipT=null; }
    if(blinkT){ clearInterval(blinkT); blinkT=null; }
    if(el && el.parentNode) el.parentNode.removeChild(el);
    if(styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    el=null; styleEl=null; tip=null;
  }

  // Back-compat: old code called .juggle()/.stroll(); harmless no-ops now so nothing errors.
  window.claudioBuddy = { start:start, destroy:destroy, open:open, markUnread:markUnread, juggle:function(){}, stroll:function(){} };
  start();   // the CRM only injects this for the office, so auto-start on load
})();
