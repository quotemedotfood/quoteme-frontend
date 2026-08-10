/* Beta list, support form, pronunciation. No dependencies. */
(function(){
  var played = false;

  // This file lives in public/ so Vite copies it verbatim; it never runs
  // through the module transform, so import.meta.env is not available here.
  // Hardcoded to match the same production Rails API host used as the
  // default fallback for VITE_PAIRME_API_BASE in apps/pairme/src/lib/api.js.
  var PAIRME_API_BASE = 'https://web-production-9f6e9.up.railway.app';

  window.pmSay = function(){
    try{
      var sp = window.speechSynthesis;
      if(!sp) return;
      sp.cancel();
      var u = new SpeechSynthesisUtterance('Trah pay. Zhev ray shom ber tan.');
      u.rate = 0.8;
      sp.speak(u);
      if(!played){
        played = true;
        var h = document.getElementById('say-hint');
        if(h) h.textContent = 'Play it as often as you like. Nobody is counting.';
      }
    }catch(e){}
  };

  function post(form, onDone){
    var body = new URLSearchParams(new FormData(form)).toString();
    fetch('/', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:body })
      .then(function(){ onDone(true); })
      .catch(function(){ onDone(false); });
  }

  function submitWaitlist(payload, onDone){
    fetch(PAIRME_API_BASE + '/v1/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res){
      return res.json().catch(function(){ return null; }).then(function(data){
        onDone({ ok: res.ok, status: res.status, data: data });
      });
    }).catch(function(){
      onDone({ ok: false, status: 0, data: null });
    });
  }

  window.pmJoin = function(ev){
    if(ev) ev.preventDefault();
    var email = document.getElementById('beta-email');
    var stateEl = document.getElementById('beta-state');
    var restEl = document.getElementById('beta-restaurant');
    var note  = document.getElementById('beta-note');
    var label = document.getElementById('beta-label');
    if(!email || !email.value || email.value.indexOf('@') < 0 || email.value.indexOf('.') < 0){
      if(note) note.textContent = 'That address is missing something.';
      return false;
    }

    var payload = { email: email.value.trim(), source: 'landing' };
    var stateVal = stateEl && stateEl.value ? stateEl.value.trim().toUpperCase() : '';
    if(stateVal) payload.state = stateVal;
    var restVal = restEl && restEl.value ? restEl.value.trim() : '';
    if(restVal) payload.favorite_restaurant = restVal;

    if(label) label.textContent = 'Sending';
    submitWaitlist(payload, function(result){
      if(result.ok){
        if(label) label.textContent = "You're in";
        if(note) note.textContent = "You're on the list. We'll be brief, and we'll be in touch before launch.";
      } else if(result.status === 422 && result.data && result.data.message){
        if(label) label.textContent = 'Try again';
        if(note) note.textContent = result.data.message;
      } else {
        if(label) label.textContent = 'Try again';
        if(note) note.textContent = "That didn't send. Email hello@pairme.wine and we'll add you by hand.";
      }
    });
    return false;
  };

  window.pmSend = function(ev){
    if(ev) ev.preventDefault();
    var form  = document.forms['support'];
    var email = document.getElementById('sup-email');
    var msg   = document.getElementById('sup-msg');
    var note  = document.getElementById('sup-note');
    var label = document.getElementById('sup-label');
    var okEmail = email && email.value.indexOf('@') > 0 && email.value.indexOf('.') > 0;
    var okMsg   = msg && msg.value.trim().length > 3;
    if(!okEmail || !okMsg){
      if(note) note.textContent = 'We need an email and a line or two.';
      return false;
    }
    if(label) label.textContent = 'Sending';
    post(form, function(ok){
      if(label) label.textContent = ok ? 'Sent' : 'Try again';
      if(note) note.textContent = ok
        ? "Got it. We'll write back, and it will be a person."
        : "That didn't send. Email hello@pairme.wine directly and we'll pick it up.";
    });
    return false;
  };
})();
