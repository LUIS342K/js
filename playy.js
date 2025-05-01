var hideCh = true;
var hideCntrl = true;
var hidePanelC = true;
var hideLocked = true;
var hideLockedInfo = true;
var showControlPlayer = false;
var hideModal = true;
var escondeTodo = false;
var inFocusMoves = true;
lockedTimeOut = 20000;
var j;
var pararTiempo = null;
var overlayTimeOut;
var epgData;
var disconnectProtection = false;
var epgTimeOut;
var currentMedia = null;
var toggleShowChannelInfoTimer = null;
var player = null;
var channelList = $('#channelsList .channels > ul');
var mediaSubOption = {};
const firstIndex = channelList.find('li:visible').first().index();
const lastIndex = channelList.find('li:visible').last().index();
channelList.find('li:first-child').addClass("active focus");
var chSearchBar = $('.channelsToolBar').outerHeight();
searchBarFocus = false;
channelList.css("padding-top", (chSearchBar * 1.25) + 'px');
var overlayInfo = $("#controlOverlay");
overlayInfo.hide();
timeNumeric = null;
numericPressed = [];
hideNumbers = null;
showSubtooltipTimer = null;
socket = io.connect(su, { query: 'token=' + t });

$(document).ready(function () {


  getEpg();
  $("#controlVolume").click(function () {
    if (player) {
      var isVolumeMuted = player.muted();

      if (isVolumeMuted) {
        player.muted(false);
      }
      else {
        player.muted(true);
      }
    }
  });

  $("#controlSub").click(function (event) {
    if (currentMedia) {
      if ($("#controlSub").hasClass('active')) {
        mediaSubOption[currentMedia.id] = "es";
        playCanal(currentMedia.id, "es", currentMedia.image)
      }
      else {
        mediaSubOption[currentMedia.id] = "en";
        playCanal(currentMedia.id, "en", currentMedia.image)
      }
    }
  });

  $("#search").focus(function (event) {
    searchBarFocus = true;
    channelList.animate({ scrollTop: 0 });
  });

  $("#search").focusout(function (event) {
    searchBarFocus = false;
  });

  $("#search").on("keyup", function () {
    if (searchBarFocus) {
      var value = $(this).val().toLowerCase();
      $(".channels li").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
      });
    }
  });

  $("#volumeRange").on("input change", function () {
    player.volume($(this).val() / 100);
    $("#rangeVolumeStatus").css("width", $(this).val() + "%");
    if (player) {
      var isVolumeMuted = player.muted();

      if (isVolumeMuted) {
        player.muted(false);
        overlayInfo.find('span').removeClass('icon icon--volume volume--muted');
        overlayInfo.find('span').addClass('icon icon--volume volume--full');
      }
    }
  })

  channelList.find('li').on({
    click: function () {
      setMediaActiveOnSwitcher($(this));

      if (!hideCh || !hideLocked || !showControlPlayer) {
        //hidePanelLocked();
        toggleChannlesList();
        hidePlayerControlInTime();
      }
    },
    mouseenter: function () {
      $(this).addClass('show-info item-hover');
      setFocusOnElement($(this));
      toggleShowChannelInfo();
    },
    mouseleave: function () {
      $(this).removeClass('show-info item-hover ');
    }
  })

  // MOUSEMOVE ====================================
  $('body').mousemove(function () {
    if (!escondeTodo) {
      escondeTodo = false;
      inFocusMoves = false;
      touchPlayer();
      hidePlayerControlInTime();
    }
  });

  // $('button.control').on('click',function(){
  //   $(this).toggleClass('active');
  // });

  socket.on("disconnect", function () {
    disconnectProtection = true;
  });

  socket.on("connect", function () {
    if (!disconnectProtection) {
      var lastMedia = localStorage.lastMedia;

      if (typeof lastMedia == "string")
        lastMedia = parseInt(lastMedia);

      // setTimeout(function(){
      if (fromMedia)
        playCanal(fromMedia);
      else if (lastMedia != undefined && lastMedia != null && lastMedia != "undefined" && Number.isInteger(lastMedia)) {
        var element = $(".btn-channel[media-id=" + lastMedia + "]");

        setMediaActiveOnSwitcher(element);
      }
      else {
        var e = channelList.find('li:first-child');

        playCanal(e.attr("media-id"), undefined, e.attr('media'));
      }

      // },2000);
    }
  });


  // Oculta PiP si el navegador no es compatible
  if (!document.pictureInPictureEnabled) {
    $('#controlPiP').parent().hide();
  }
});

$(document).mousemove(function () {
  document.body.style.pointerEvents = 'auto';
})

function clearSearch() {
  $("#search").val("");
  $(".channels li").filter(function () {
    $(this).show();
  });
}

function getEpg() {
  //console.log("getEpg()");

  $.post("https://charly.zappingtv.com/player", function (response) {
    epgData = response.data;
    //console.log("epgData",epgData);
    var h = _.min(epgData, "end_time");

    var nU = h.end_time - parseInt(moment().format("X"));

    if (nU <= 5)
      nU = 60;

    if (currentMedia)
      setEpgOnActive(currentMedia);

    clearTimeout(epgTimeOut);
    epgTimeOut = setTimeout(function () {
      getEpg();
    }, nU * 1000)

  }, "json");
}

function getLocked(data) {
  $.post("/player/modals", data)
    .done(function (res) {
      if (res.status)
        $("#locked").html(res.data);
    })
    .fail(function (xhr, status, error) {

    });
}

///===================

$('#playerControl').hide();
$('#channelList').hide();
$('#playerCover').hide();


touchPlayer();
hidePlayerControlInTime();

// PLAYERCONTROL ====================================
function touchPlayer() {
  if (hideCh) {
    showPlayerControl();
  }
}

//CONTROLES DE TECLADO ====================================
var KEYS = { ENTER: 13, LEFT: 37, RIGHT: 39, DOWN: 38, UP: 40, P: 80, SPACE: 32, SCAPE: 27, F: 70, M: 77, VOLUME_UP: 171, VOLUME_DOWN: 173, C_VOLUME_DOWN: 189, C_VOLUME_UP: 187 };
var KEYS_NUMERIC = { "48": 0, "49": 1, "50": 2, "51": 3, "52": 4, "53": 5, "54": 6, "55": 7, "56": 8, "57": 9 };

$(document).keydown(function (e) {
  if (!searchBarFocus) {

    var keycode = e.keyCode;

    if (KEYS_NUMERIC[keycode] != undefined) {
      return pressNumericKey(KEYS_NUMERIC[keycode], true);
    }

    switch (e.which) {
      // ESCAPE ====================================
      case KEYS.SCAPE:
        hideControl();
        hidePlayerControl();
        if (!escondeTodo && hideLocked) {
          $('#playerCover').hide();
          hideChannels();
        }
        if (!hideModal) {
          hideModalPayment();
        }
        break;
      // PA'LAO DER ====================================

      case KEYS.RIGHT:

        if (hideCh) {
          toggleChannlesList();
          showCoverPlayer();
        }
        else {
          document.body.style.pointerEvents = 'none';
          var element = channelList.find('li.active');
          setFocusOnElement(element);
          setChannelScrollActive();
          $('.search-helper').addClass('visible');
        }
        break;
      case KEYS.LEFT:
        inFocus = false;
        toggleChannlesList();

        if (hideLocked) {
          showPlayerControl();
        }

        hidePlayerControlInTime();
        setTimeout(function () {
          channelList.find('li:not(.active).focus').removeClass('focus');
          var element = channelList.find('li.active');
          setFocusOnElement(element);
        }, 100)


        break;
      // PARRIA ====================================
      case KEYS.UP:
        // Channels ========================================
        navigationChannelsControlKeyboardDown();
        toggleChannelWhenChange();
        touchInterface();
        break;
      // PABAJO ====================================
      case KEYS.DOWN:
        navigationChannelsControlKeyboardUp();
        toggleChannelWhenChange();
        touchInterface();

        break;
      // ENTER ====================================
      case KEYS.ENTER:
        if (numericPressed.length)
          return numericChange();

        var focusItem = channelList.find('li.focus');
        var noFocusItem = channelList.find('li:not(".focus")');
        noFocusItem.removeClass('active');
        focusItem.addClass('focus active');
        if (!hideCh) {
          playCanal(focusItem.attr('media-id'), undefined, focusItem.attr('media'));
        }
        if (!hideCh || !hideLocked || !showControlPlayer) {
          //hidePanelLocked();
          $('#lowerBar').addClass('hide');
          toggleChannlesList();
          hidePlayerControlInTime();
        }
        touchInterface();
        break;

      case KEYS.F:
        if (hideCh) {
          toggleFullScreen();
          hidePlayerControlInTime();
        } else {
          return false;
        }
        break;
      case KEYS.M:
        controlOverlay();
        $("#controlOverlay").find('small').html('');

        if (player) {
          var isVolumeMuted = player.muted();

          if (isVolumeMuted) {
            player.muted(false);
            overlayInfo.find('span').removeClass('icon icon--volume volume--muted');
            overlayInfo.find('span').addClass('icon icon--volume volume--full');
          }
          else {
            overlayInfo.find('span').removeClass('icon icon--volume volume--full');
            overlayInfo.find('span').addClass('icon icon--volume volume--muted');

            player.muted(true);
          }
        }
        break;
      case KEYS.VOLUME_UP:
      case KEYS.C_VOLUME_UP:
        if (player) {
          var cv = player.volume();
          if (cv < 1) cv = cv + 0.1;
          $("#volumeRange").val(cv * 100);
          $("#volumeRange").trigger('change');
        }
        break;
      case KEYS.VOLUME_DOWN:
      case KEYS.C_VOLUME_DOWN:
        if (player) {
          var cv = player.volume();
          if (cv > 0.1) cv = cv - 0.1;
          $("#volumeRange").val(cv * 100);
          $("#volumeRange").trigger('change');
        }
        break;

      default: return; // exit this handler for other keys
    }
    e.preventDefault(); // prevent the default action (scroll / move caret)
  }
  else {
    switch (e.which) {
      case KEYS.DOWN:
        $('#search').focusout();
        $('#search').blur();
        searchBarFocus = false;
        navigationChannelsControlKeyboardUp();

        break;
      case KEYS.UP:
        $('#search').focusout();
        $('#search').blur();
        searchBarFocus = false;
        navigationChannelsControlKeyboardDown();

        break;
      case KEYS.SCAPE:
        $('#search').focusout();
        $('#search').blur();
        $("#search").val("");
        $("#search").trigger('keyup');
        break;
      default:
    }
  }
});

$(document).keyup(function (e) {
  var keycode = e.keyCode;

  if (KEYS_NUMERIC[keycode] != undefined) {
    return pressNumericKey(KEYS_NUMERIC[keycode], false);
  }
});

function pressNumericKey(key, down) {
  var nu = overlayInfo.find('span');
  if (down) {
    clearTimeout(timeNumeric);

    numericPressed.push(key);

    if (numericPressed.length)
      nu.html(nu.html() + key);
    else
      nu.html(key);

    $("#controlOverlay").show();
    $("#controlOverlay").addClass('visible');
    $('#controlOverlay').find('span').removeClass();
    $("#controlOverlay").find('small').html('Presiona Enter para continuar');
    //hideSubInterface();

    timeNumeric = setTimeout(function () {
      var n = parseInt(numericPressed.toString().replace(/,/g, ""));
      numericChange(n);
    }, 3000);
  }
  else {
    if (numericPressed.length == 3) {
      clearTimeout(timeNumeric);

      var n = parseInt(numericPressed.toString().replace(/,/g, ""));

      nu.html(n);
      $("#controlOverlay").show();
      $("#controlOverlay").addClass('visible');
      numericChange(n);
    }
  }
}

function numericChange(n) {
  if (n == undefined)
    n = parseInt(numericPressed.toString().replace(/,/g, ""));

  var nu = overlayInfo.find('span');

  numericPressed = [];

  var element = $(".btn-channel[number=" + n + "]");

  if (element != undefined && element.attr("media-id") != undefined) {
    $("#controlOverlay").removeClass('visible');
    $("#controlOverlay").fadeOut('fast');

    nu.html("");
    clearTimeout(timeNumeric);
    clearTimeout(hideNumbers);
    return setMediaActiveOnSwitcher($(element));
  }
  else {
    nu.html("--");
  }

  clearTimeout(hideNumbers);
  hideNumbers = setTimeout(function () {
    nu.html("");
    $('#controlOverlay').find('span').removeClass();
    $("#controlOverlay").removeClass('visible');
    $("#controlOverlay").fadeOut('fast');
  }, 2000);
}

function controlOverlay() {
  $("#controlOverlay").show();
  $("#controlOverlay").addClass('visible');
  clearTimeout(overlayTimeOut);
  overlayTimeOut = setTimeout(function () {
    $("#controlOverlay").removeClass('visible');
    $("#controlOverlay").fadeOut('fast');
    $('#controlOverlay').find('span').removeClass();
  }, 2000);
}

function setFocusOnElement(element) {
  channelList.find('li.focus').removeClass('focus');
  element.addClass('focus');
  var mediaAlias = element.attr('media');
  setEpgOnFocus(mediaAlias, element);
}

function setEpgOnFocus(mediaAlias, element) {
  if (epgData != null && epgData != undefined) {
    var epg = epgData[mediaAlias];
    //console.log(epg);
    if (epg != undefined) {
      var dS = moment.unix(epg.start_time).format("HH:mm");
      var dE = moment.unix(epg.end_time).format("HH:mm");
      var nU = moment().format("X");
      var p = Math.abs(((epg.end_time - parseInt(nU)) / (epg.end_time - epg.start_time)) - 1);
      var image = mediaAlias;
      $(".epg-time").show();
      element.find(".epg-name").html(epg.title);
      $(".epg-channel").html(epg.name);
      $(".epg-title").html(epg.title);
      $(".epg-description").html(epg.desc);
      $(".epg-logo").attr("src", "https://davinci.zappingtv.com/gato/media/300/canales/color/" + image + ".jpg");
      
      if(epg.tvRating !== undefined && epg.tvRating !== null) 
      {
        $("#epg-rating-img").attr("src", "https://davinci.zappingtv.com/static/web-assets/img/tvrating-br/rating-" + epg.tvRating.toLowerCase() + ".png");
      }
      else
      {
        $("#epg-rating-img").attr("src", "");
      }
      
      $(".start-time").html(dS);
      $(".end-time").html(dE);
      //$("#epg .progress").show();
      $(".bar-time span").css('width', (p * 100) + '%').attr('aria-valuenow', p);
    }
    else {
      var desc = element.find(".desc").html();
      var name = element.find(".name").html();
      $(".epg-title").html(name);
      $(".epg-description").html(desc);
      $(".epg-logo").attr("src", "https://davinci.zappingtv.com/gato/media/300/canales/color/" + mediaAlias + ".jpg");
      $("#epg-rating-img").attr("src", "https://davinci.zappingtv.com/static/web-assets/img/tvrating-br/rating-l.png");
      $(".epg-time").hide();
    }
  }
}

function setEpgOnActive(data) {
  /*
  CAMNBIAR TODAS LAS CLASES PARA QUE SEAN LAS DE LA BARRA DE ABAJO
  */

  if (epgData == null || epgData == undefined)
    return;

  var mediaAlias = data.image;

  var epg = epgData[mediaAlias];

  if (epg != undefined) {
    var dS = moment.unix(epg.start_time).format("HH:mm");
    var dE = moment.unix(epg.end_time).format("HH:mm");
    var nU = moment().format("X");
    var p = Math.abs(((epg.end_time - parseInt(nU)) / (epg.end_time - epg.start_time)) - 1);
    var image = mediaAlias;
    $(".control-time").show();
    // element.find(".control-name").html(epg.title);
    $(".control-title").html(epg.title);
    $(".control-description").html(epg.desc);
    $(".control-logo").attr("src", "https://davinci.zappingtv.com/gato/media/300/canales/white/" + image + ".png");
    
    if(epg.tvRating !== undefined && epg.tvRating !== null)
    {
      $("#rating-img").attr("src", "https://davinci.zappingtv.com/static/web-assets/img/tvrating-br/rating-" + epg.tvRating.toLowerCase() + ".png");
    }
    else
    {
      $("#epg-rating-img").attr("src", "");
    }
    
    $(".control-start-time").html(dS);
    $(".control-end-time").html(dE);
    $('.videoPlaceHolder').css("background-image", 'url(https://davinci.zappingtv.com/gato/media/300/canales/white/' + image + '.png)');
    //$("#epg .progress").show();
    $(".control-bar-time span").css('width', (p * 100) + '%').attr('aria-valuenow', p);
  }
  else {
    // var desc = element.find(".control-desc").html();
    // var controlName = element.find(".control-ch-name").html();
    $(".control-title").html(data.name);
    $(".control-description").html(data.description);
    $(".control-logo").attr("src", "https://davinci.zappingtv.com/gato/media/300/canales/white/" + data.image + ".png");
    $("#rating-img").attr("src", "https://davinci.zappingtv.com/static/web-assets/img/tvrating-br/rating-l.png");
    $(".control-time").hide();
    $('.videoPlaceHolder').css("background-image", 'url(https://davinci.zappingtv.com/gato/media/300/canales/white/' + data.image + '.png)');

  }

}

// Muestra Player Control +  controles ====================================
function showPlayerControl() {
  if (hideCh && hideLocked) {
    showControl();
    $('#playerControl').fadeIn();
  }
  showCoverPlayer();
  var showControlPlayer = true;
}
// Esconde controles ====================================
function hidePlayerControl() {
  hideControl();
  $('#playerControl').fadeOut();
  if (hideCh) {
    hideCoverPlayer();
  }
}

// Esconde Player en N seg ====================================
function hidePlayerControlInTime() {
  clearTimeout(j);
  j = setTimeout(function () {
    hidePlayerControl();
    if (hideCh) {
      $('#playerCover').fadeOut();
    }
  }, 3000);
}

// Full Screen ====================================
function toggleFullScreen() {
  var docelem = document.documentElement;
  $('#controlExpand').toggleClass('active');
  if ($(".fullscreen").hasClass('expand')) {

    if (docelem.requestFullscreen) {
      docelem.requestFullscreen();
    }
    else if (docelem.mozRequestFullScreen) {
      docelem.mozRequestFullScreen();
    }
    else if (docelem.webkitRequestFullscreen) {
      docelem.webkitRequestFullscreen();
    }
    else if (docelem.msRequestFullscreen) {
      docelem.msRequestFullscreen();
    }
    $(".fullscreen").removeClass('expand');
  }
  else {
    $(".fullscreen").addClass('expand');
    if (document.exitFullscreen) {
      document.exitFullscreen(); // Standard
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen(); // Blink
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen(); // Gecko
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen(); // Old IE
    }
  }
}

function togglePiP() {
  try {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      player.requestPictureInPicture();
    }
  } catch (e) {
    console.error('Error al requerir picture in picture')
  }
}

// esconde cover ====================================
function hideCoverPlayer() {
  if (!escondeTodo && !hideCh) {
    $('#playerCover').fadeOut();
  }
}
// muestra cover ====================================
function showCoverPlayer() {
  if (!escondeTodo) {
    $('#playerCover').fadeIn();
  }

}
// Abre y cierra canales ====================================
function toggleChannlesList() {

  setChannelScrollActive();

  if (hideCh) {
    showChannels();
    hidePlayerControl();
    showCoverPlayer();
    hideLockedChannel();
  }
  else {
    hideChannels();

    if (!hideLocked)
      showLockedChannel();

    var inFocusMoves = false;
    if (!inFocusMoves) {
      showPlayerControl();
    }
  }
}
// Abre Canales ====================================
function showChannels() {
  $('#channelsList').addClass('list-visible');
  $('#channelsList').removeClass('list-hide');
  channelsList.focus();
  hideCh = false;
}

// Cierra Canales ====================================
function hideChannels() {
  $('#channelsList').addClass('list-hide');
  $('#channelsList').removeClass('list-visible');
  hideCh = true;
}

// Abre y cierra canales info ====================================
function toggleShowChannelInfo() {

  var chInfo = $('#channelsInfo');
  chInfo.removeClass('show');

  if (toggleShowChannelInfoTimer != null)
    clearTimeout(toggleShowChannelInfoTimer);

  toggleShowChannelInfoTimer = setTimeout(function () {
    chInfo.addClass('show');
  }, 300)
}

function toggleChannelWhenChange() {
  var chMediaLogo = $('#mediaLogo');
  chMediaLogo.parent('.mediaImage').removeClass('show');
  setTimeout(function () {
    chMediaLogo.parent('.mediaImage').addClass('show')
  }, 150)
}

function getFocusAndActiveIndex() {
  var index = channelList.find('.focus').index();
  var indexActive = channelList.find('.active').index();

  if (searchBarFocus) {
    index = channelList.find('.focus:visible').index();
    indexActive = channelList.find('.active:visible').index();

    if (index < 0)
      index = 0;
  }
  else {
    index = channelList.find('.focus').index();
    indexActive = channelList.find('.active').index();
  }

  return {
    index: index,
    indexActive: indexActive
  };
}

function navigationChannelsControlKeyboardUp() {
  var elementFocus = getFocusAndActiveIndex();

  var index = elementFocus.index;
  var indexActive = elementFocus.indexActive;

  if (!hideCh) {
    channelList.focus();
  }

  var prevIndex = index - 1;

  if (!channelList.find('li:eq( ' + prevIndex + ' )').is(":visible")) {
    prevIndex = channelList.find('li:visible').last().index();
    var arr = [];

    channelList.find('li:visible').each(function () {
      var i = $(this).index();
      arr.push(i);
    });

    arr.reverse();

    for (var k in arr) {
      if (arr[k] < index) {
        prevIndex = arr[k];
        break;
      }
    }
  }

  index = (index == firstIndex) ? lastIndex : prevIndex;
  indexActive = (indexActive == firstIndex) ? lastIndex : indexActive - 1;

  inFocusMoves = true;
  if (!hideCh && inFocusMoves) {
    toggleShowChannelInfo();
    channelList.find('.focus').removeClass('focus item-hover')
    var element = channelList.find('li:eq( ' + index + ' )')

    setFocusOnElement(element);
  } else if (hideCh && inFocusMoves) {
    var item = channelList.find('li:eq( ' + indexActive + ' )');
    setMediaActiveOnSwitcher(item);
  }
  setChannelScrollActive();
  document.body.style.pointerEvents = 'none';
}

function navigationChannelsControlKeyboardDown() {

  var elementFocus = getFocusAndActiveIndex();

  var index = elementFocus.index;
  var indexActive = elementFocus.indexActive;

  if (!hideCh) {
    channelList.focus();
  }

  var nextIndex = index + 1;

  if (!channelList.find('li:eq( ' + nextIndex + ' )').is(":visible")) {
    nextIndex = channelList.find('li:visible').first().index();
    channelList.find('li:visible').each(function () {
      var i = $(this).index();
      if (i > index) {
        nextIndex = i;
        return false;
      }
    });
  }
  index = (index == lastIndex) ? 0 : nextIndex;
  indexActive = (indexActive == lastIndex) ? 0 : indexActive + 1;
  inFocusMoves = true;

  if (!hideCh && inFocusMoves) {
    toggleShowChannelInfo();
    channelList.find('.focus').removeClass('focus item-hover')
    var element = channelList.find('li:eq( ' + index + ' )');
    setFocusOnElement(element);
  } else if (hideCh && inFocusMoves) {
    var item = channelList.find('li:eq( ' + indexActive + ' )');
    setMediaActiveOnSwitcher(item);
  }

  setChannelScrollActive();
  document.body.style.pointerEvents = 'none';
}

function setChannelScrollActive() {
  var scrollTo = channelList.find('.focus'),
    scrollToActive = channelList.find('.active');

  if (scrollTo != undefined && scrollTo.offset() != undefined)
    channelList.animate({ scrollTop: scrollTo.offset().top - channelList.offset().top - (scrollTo.height() * 2) + channelList.scrollTop() }, 100);
}


function setMediaActiveOnSwitcher(element) {
  channelList.find('li.active').removeClass('active');
  channelList.find('li.focus').removeClass('focus');
  element.addClass('active focus');
  playCanal(element.attr("media-id"), undefined, element.attr('media'));
}



// Agrega los contenidos de los canales ====================================

// Oculta Controles ====================================
function hideControl() {
  $('.reveal-item').each(function (i) {
    var $li = $(this);
    setTimeout(function () {
      $li.addClass('reveal--hide');
    }, i * 25);
  });
  hidePanelC = true;
}
// Muestra Controles ====================================
function showControl() {
  hideCh = true;
  locked = false;
  setTimeout(function () {
    $('.reveal-item').each(function (i) {
      var $li = $(this);
      setTimeout(function () {
        $li.addClass('reveal--show');
        $li.removeClass('reveal--hide');
      }, i * 10);
    });
    $('.control-bottom .reveal-item').each(function (i) {
      var $li = $(this);
      setTimeout(function () {
        $li.addClass('reveal--show');
      }, i * 50);
    });
    $(' .control-top .reveal-item').each(function (i) {
      var $li = $(this);
      setTimeout(function () {
        $li.addClass('reveal--show');
      }, i * 50);
    });
  }, 250);
  hideCntrl = false;
}


function showLockedLowerBar() {
  hideLocked = true;
  $("#lowerBar").removeClass('hide');
  $("#lowerBar").addClass('show');
  $("#lowerBar .bar span").css("width", 1);
  $("#lowerBar .bar span").stop(true).animate({ width: '100%' }, lockedTimeOut);
}

function hideLockedLowerBar() {
  //hideLocked = false;
  $("#lowerBar").removeClass('show');
  $("#lowerBar").addClass('hide');
  $("#lowerBar .bar span").stop(true);
}
// Muestra bloqueo ====================================
function showLockedChannel() {
  hideLocked = false;
  hideLockedInfo = false;
  $('#locked').show();
  $('#locked').fadeIn();
  $('#channelsInfo').removeClass('show')
  $('#channelsInfo').addClass('hide')
  $('.locked-container, .locked-image, .locked__package, .locked-icon, .locked-brand , .shortcuts').removeClass('hideLocked');
  $('.locked-container, .locked-image, .locked__package, .locked-icon, .locked-brand , .shortcuts').addClass('showLocked');
  if (hideModal) {
    showModalPayment();
  }
}
// Esconde bloqueo ====================================
function hideLockedChannel() {
  $('#locked').hide();
  $('#channelsInfo').removeClass('hide')
  $('#channelsInfo').addClass('show')
  $('.locked-container, .locked-image, .locked__package, .locked-icon, .locked-brand , .shortcuts').removeClass('showLocked');
  $('.locked-container, .locked-image, .locked__package, .locked-icon, .locked-brand , .shortcuts').addClass('hideLocked');
}

function showModalPayment() {
  $('#checkoutPaymentDisplay').on({
    click: function () {
      window.open('/dashboard', '_blank');
      // $('.modal.modal--checkout').removeClass('hide');
      // $('.modal.modal--checkout').addClass('show');
      // hideModal = false;
    }
  })
}

function hideModalPayment() {
  hideModal = true;
  $('.modal.modal--checkout').addClass('hide');
  $('.modal.modal--checkout').removeClass('show');
}

function checkoutProcessExampleForNachito(puid) {
  $('.modal.modal--checkout .modal-block .body').css('opacity', '0.1');
  $('.modal.modal--checkout button').attr('disabled', true);
  $('.modal.modal--checkout button').removeClass('success');
  $('.modal.modal--checkout .total-pay').removeClass('success');
  $('.modal.modal--checkout button').addClass('loading').html('');
  $('.modal.modal--checkout .notification').removeClass('show');
  $('.modal.modal--checkout .notification').addClass('hide');
  $(' .close').fadeOut();

  var data = { uid: puid };

  $.post("/payments/player", data)
    .done(function (r) {
      if (r.status) {
        $('.modal.modal--checkout .modal-block .body').css('opacity', '1');
        $(' .close').fadeIn();
        $('.modal.modal--checkout button').attr('disabled', false);
        $('.modal.modal--checkout button').removeClass('loading');
        $('.modal.modal--checkout button').addClass('success').html('¡Perfecto!');
        $('.modal.modal--checkout .total-pay').addClass('success');
        //$('.modal.modal--checkout .notification').addClass('show');
        setTimeout(function () {
          hideModalPayment();
          var element = $(".btn-channel[media-id=" + currentMedia.id + "]")
          setMediaActiveOnSwitcher(element);
        }, 5000);
      }
      else {
        $('.modal.modal--checkout .modal-block .body').css('opacity', '1');
        $('.modal.modal--checkout .notification').addClass('show').html(r.error);
        $('.modal.modal--checkout button').attr('disabled', false);
        $('.modal.modal--checkout button').removeClass('loading').html('Suscríbete ahora');
      }
    }).fail(function () {
      //alert("Ocurrió un error al realizar el pago, intentalo más tarde");
      $('.modal.modal--checkout .modal-block .body').css('opacity', '1');
      $('.modal.modal--checkout .notification').addClass('show').html("Se produjo un error al intentar crear la suscripción <strong>cod: 941</strong>");
      $('.modal.modal--checkout button').attr('disabled', false);
      $('.modal.modal--checkout button').removeClass('loading').html('Suscríbete ahora');
    })

}


// Componente bloqueo ====================================
function showPanelLocked() {
  showLockedLowerBar();
  if (pararTiempo != null)
    clearTimeout(pararTiempo);

  pararTiempo = setTimeout(function () {
    $("#lowerBar").addClass('hide');
    hideControl();
    hideChannels();
    hidePlayerControl();
    stop();
    showLockedChannel();
  }, lockedTimeOut)
}

// elementos que se muestran al interactuar con la interface
function touchInterface() {
  //=================
  if (hideCh && hideLocked) {
    showPlayerControl();
    hidePlayerControlInTime();
  }

  if (!hideLockedInfo && !showControlPlayer) {
    //hidePanelLocked();
    //$('#locked').hide();
    $('#playerCover').fadeOut();
    showPlayerControl();
    hidePlayerControlInTime();
  }
  else if (hideLocked && hideCh && !showControlPlayer) {
    //$('#locked').hide();
    //$("#lowerBar").addClass('hide');
    //hidePanelLocked();
    showPlayerControl();
    hidePlayerControlInTime();
  }
}

// mostrar elementos necesarios en la interface
function showInterface() {

}

function stop() {
  if (player) {
    player.pause();
    //player.src('');
  }
}


function hidePanelLocked() {
  hideLockedInfo = true;
  hideLocked = true;

  hideLockedChannel();
  hideLockedLowerBar();
  clearTimeout(pararTiempo);
}

function togglePlayChannelVideo() {  
  $('.videoPlaceHolder').addClass('show');
  $('.videoPlaceHolder').removeClass('show');
  $('#theplayer').removeClass('show');

  toggleShowChannelInfoTimer = setTimeout(function () {
    $('#theplayer').addClass('show');
    $('.videoPlaceHolder').addClass('show');
  }, 300)
}

function showVideoPlaceHolder() {
  $('.videoPlaceHolder').addClass('show');
  $('.videoPlaceHolder').removeClass('show');
  $('#theplayer').removeClass('show');
  console.log("showVideoPlaceHolder remove")

  if (toggleShowChannelInfoTimer != null)
  {
    clearTimeout(toggleShowChannelInfoTimer);
    $('#theplayer').addClass('show');
    $('.videoPlaceHolder').addClass('show');
  }  
}

function hideVideoPlayerHolder() {
  if (toggleShowChannelInfoTimer != null)
    clearTimeout(toggleShowChannelInfoTimer);

  toggleShowChannelInfoTimer = setTimeout(function () {
    $('#theplayer').addClass('show');
    $('.videoPlaceHolder').addClass('show');
  }, 300)
}

// Funciones de teclado ====================================


function playCanal(media, withSub, alias) {
  hideLockedChannel();
  hidePanelLocked();
  //togglePlayChannelVideo();
  showVideoPlaceHolder();

  setTimeout(function () {
    clearSearch();
  }, 500)

  var t = { media: media };

  if (withSub != undefined)
    t.withSub = withSub;
  else if (mediaSubOption[media] != undefined)
    t.withSub = mediaSubOption[media];

  //console.log("t =>",t);

  if (alias != undefined)
    $('.videoPlaceHolder').css("background-image", 'url(https://davinci.zappingtv.com/gato/media/300/canales/white/' + alias + '.png)');

  socket.emit('playCanal', t);
}

function changeMuteIcon() {
  var isVolumeMuted = player.muted();

  if (isVolumeMuted) {
    // $("#controlVolume").removeClass('active');
    $("#controlVolume span").removeClass('volume--full');
    $("#controlVolume span").addClass('volume--muted');
  }
  else {
    // $("#controlVolume").addClass('active');
    $("#controlVolume span").removeClass('volume--muted');
    $("#controlVolume span").addClass('volume--full');
    //$("#mutealert").addClass('hidden');
  }
}

function setPlayerHref(data) {
  //hideLockedView();

  var href = data.href;

  if (player == null) {
    player = videojs('theplayer', {
      muted: true,
      language: "es"
    });
  }

  player.src([
    { type: "application/x-mpegURL", src: href }
  ]);

  hideVideoPlayerHolder();

  player.ready(function () {
    var promise = player.play();

    changeMuteIcon();

    if (promise !== undefined) {
      promise.then(function () {
        // Autoplay started!
      }).catch(function (error) {
        // Autoplay was prevented.
      });
    }
  });

  player.on('volumechange', function () {
    changeMuteIcon();
  });
}

function showSubtooltip() {
  if (showSubtooltipTimer != null)
    clearTimeout(showSubtooltipTimer);

  $('.control-notificator').show();

  showSubtooltipTimer = setTimeout(function () {
    $('.control-notificator').fadeOut();
  }, 4000);
}

socket.on('data', function (data) {
  if (data.locked != undefined && data.locked == true) {
    showPanelLocked();

    var e = {
      packageID: data.package_id,
      mediaAlias: data.image
    }
    getLocked(e);
  }

  if (data.image)
    $('.videoPlaceHolder').css("background-image", 'url(https://davinci.zappingtv.com/gato/media/300/canales/white/' + data.image + '.png)');

  //.selectedChannel-image
  //


  try {
    ga('send', {
      hitType: 'pageview',
      page: "/player/" + alias(data.name),
      title: data.name
    });
  } catch (error) {
    console.log('Error al enviar pageview a google analytics')
  }


  //console.log("data.href =>",data.href);

  setPlayerHref(data);
  $('.control-notificator').removeClass('show');

  $("#controlSub").attr("disabled", true);

  var l = data.selectedLanguage != undefined ? data.selectedLanguage : "es";

  if (l == "en") {
    $(".control-notificator").html("Audio alternativo activado");
    $("#controlSub").addClass('active');
  }
  else {
    $(".control-notificator").html("Audio alternativo disponible");
    $("#controlSub").removeClass('active');
  }

  if (data.subAvailable) {
    //$('.control-notificator').addClass('show');
    showSubtooltip();
    $("#controlSub").attr("disabled", false);
  }
  else {
    if (showSubtooltip != null)
      clearTimeout(showSubtooltip);

    $('.control-notificator').hide();
  }

  localStorage.lastMedia = data.id;

  currentMedia = data;

  setEpgOnActive(data);
});

function alias(str) {
  if (str) {
    str = str.replace(/[ÀÁÂÃÄÅàáâãäå]/g, "a");
    str = str.replace(/[ÈÉÊËéêëè]/g, "e");
    str = str.replace(/[Íí]/g, "i");
    str = str.replace(/[Óó]/g, "o");
    str = str.replace(/[Úú]/g, "u");
    str = str.replace(/[Ññ]/g, "n");
    str = str.replace(/[ ]/g, "-");
    //.... all the rest
    return str.replace(/[^a-z0-9\-]/gi, '').toLowerCase(); // final clean up
  }
  else {
    return str;
  }
}
