function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeSlika = sporocilo.search(new RegExp(/https?:\/\/\S+(.jpg|.png|.gif)/, 'g')) > -1;
  var jeVideo = sporocilo.search(new RegExp(/(?:https:\/\/www\.youtube\.com\/watch\?v=)(\S{11})/, 'gi')) > -1;
  if (jeSmesko || jeVideo || jeSlika) {
    sporocilo = sporocilo = sporocilo.replace(/\<(?!img|iframe|\/iframe)/g, '&lt;');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
    }  else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = addImages(sporocilo);
  sporocilo = dodajSmeske(sporocilo);
  sporocilo = addVideo(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

function addImages(sporocilo) {
  var regex = new RegExp(/https?:\/\/\S+(.jpg|.png|.gif)/, 'g');
  var slike = sporocilo.match(regex);
  if (slike != null)
    for (var i = 0; i<slike.length; i++) {
      sporocilo += '<img style="margin: 0px 0px 0px 20px; display:block;" width="200px" src="' + slike[i] +'">';
    }
  return sporocilo;
  
}

function addVideo(sporocilo) {
  var regex = new RegExp(/(?:https:\/\/www\.youtube\.com\/watch\?v=)(\S{11})/, 'g');
  var videi = [];
  var video;
  while ((video=regex.exec(sporocilo)) != null) {
    videi.push(video[1]);
  }
  if (videi != null) {
    for(var i=0; i<videi.length; i++) {
      sporocilo += "<iframe src='https://www.youtube.com/embed/" + videi[i] + "' allowfullscreen style='width:200px; height:150px; display: block; margin: 0px 0px 0px 20px;'></iframe>"; 
    }
  }
  return sporocilo;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
      $('#poslji-sporocilo').val('/zasebno ' + '"' + $(this).text() + '" ');
      $('#poslji-sporocilo').focus();
    });
  });
  
  socket.on('dregljaj', function(dregljaj) {
    if (dregljaj.dregljaj) {
      $('#vsebina').jrumble();
      $('#vsebina').trigger('startRumble');
      setTimeout(function(){ $('#vsebina').trigger('stopRumble'); }, 1500);
    }
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}
