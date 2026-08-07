/* Beta list, support form, pronunciation. No dependencies. */
(function(){
  var played = false;

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

  window.pmJoin = function(ev){
    if(ev) ev.preventDefault();
    var form = document.forms['beta'];
    var email = document.getElementById('beta-email');
    var note  = document.getElementById('beta-note');
    var label = document.getElementById('beta-label');
    if(!email || !email.value || email.value.indexOf('@') < 0 || email.value.indexOf('.') < 0){
      if(note) note.textContent = 'That address is missing something.';
      return false;
    }
    if(label) label.textContent = 'Sending';
    post(form, function(ok){
      if(label) label.textContent = ok ? "You're in" : 'Try again';
      if(note) note.textContent = ok
        ? "You're on the list. We'll be brief, and we'll be in touch before launch."
        : "That didn't send. Email hello@pairme.wine and we'll add you by hand.";
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
