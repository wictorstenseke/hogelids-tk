<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="_token" content="{{ csrf_token() }}" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href='https://fonts.googleapis.com/css?family=Roboto+Condensed:400,300,300italic,400italic,700' rel='stylesheet' type='text/css'>
  <title>Boka banan | Högelids Tennisklubb</title>

  <link rel="stylesheet" href="{{ asset('css/main.css') }}">

</head>
<style>

</style>
<body>
  <div class="bildbox">
    <a href="{{ action('ReservationController@index') }}">
      <img src="{{ asset('img/htk-logo.svg') }}" class="logotype">
    </a>
  </div>

  <p class="intro-text">Välkommen till Högelids Tennisklubb! Här kan du som är medlem boka speltid på vår grusbana och se andra medlemmars bokade tider.</p>

  <div class="cta-button">Boka speltid</div>

  <!-- Modal -->
  <div class="reservation-modal" {!! ($errors->any()) ? 'style="display: block;"' : '' !!}>
    <i class="close-btn fa fa-times"></i>
    <p>Fyll i uppgifterna nedan för att boka speltid.
      Avboka speltiden vid förhinder.
      Detta görs genom att trycka på soptunnan under bokade tider.
    </p>

    @if ( $errors->any() )
    <div class="feedback-error">
      @foreach ($errors->all() as $error)
      {{$error}}<br>
      @endforeach
    </div>
    @endif

    <form action="{{ route('reservation.store') }}" method="POST">
      <input type="hidden" name="_token" value="{{ csrf_token() }}">
      <input
        type="text"
        id="date"
        name="start_date"
        class="{{ $errors->has('start_date') ? 'error' : '' }}"
        placeholder="Vilket datum?"
        value="{{ old('start_date') }}"
      >
      <br>
      <input
        type="text"
        id="start"
        name="start_time"
        class="{{ $errors->has('start_time') ? 'error' : '' }}"
        placeholder="Börjar spela?"
        value="{{ (old('start_time')) ? old('start_time') : '' }}"
      >
      <br>
      <input
        type="text"
        id="stop"
        name="stop_time"
        class="{{ $errors->has('stop_time') ? 'error' : '' }}"
        placeholder="Slutar spela?"
        value="{{ (old('stop_time')) ? old('stop_time') : '' }}"
      >
      <br>
      <input
        type="text"
        name="name"
        class="{{ $errors->has('name') ? 'error' : '' }}"
        placeholder="Skriv ditt namn"
        value="{{ old('name') }}"
      >
      <br>
      <input type="submit" value="Bekräfta bokning" class="submit-button">
    </form>
  </div>

  @if($futureResesrvations->count())
    <div class="bokade-tider">
      <h4>Bokade tider 2016</h4>
      <div class="hr"></div>
      @foreach($futureResesrvations as $reservation)
        <div class="bokad-tid">
          <p>
            {{ $reservation->start->formatLocalized('%e %b %H:%M') }}
            -
            {{ $reservation->stop->format('H:i') }}
            <strong>{{ $reservation->name }}</strong>
            <i class="fa fa-trash-o tiptool" data-id="{{ $reservation->id }}" aria-hidden="true"></i>
            <div class="test-tip" data-tooltip-id="{{ $reservation->id }}">
              <p>Vill du radera bokning?</p>
              <p class="tip-button close-tip">Nej</p>
              <p data-reservation-id="{{ $reservation->id }}" class="tip-button">Ja</p>
            </div>
          </p>
        </div>
        <div class="hr2"></div>
      @endforeach
    </div>
  @else
    <div class="bokade-tider">
      <h4>Bokade tider 2016</h4>
      <div class="hr"></div>
      <div class="empty-state">
        {{-- Icon made by Papedesign from www.flaticon.com  --}}
        <img src="{{ asset('img/tennis-ball.svg') }}">
        <p class="bold-text">Ledigt!</p>
        <p>Det finns inga bokade tider just nu, banan är din!</p>
      </div>
    </div>
  @endif
  @if($oldResesrvations->count())
    <div class="bokade-tider">
      <h4>Historik</h4>
      <div class="hr"></div>
      @foreach($oldResesrvations as $reservation)
        <div class="bokad-tid">
          <p>
            {{ $reservation->start->diffForHumans() }}
            {{ $reservation->start->format('H:i') }}
            -
            {{ $reservation->stop->format('H:i') }}
            <strong>{{ $reservation->name }}</strong>
          </p>
        </div>
        <div class="hr2"></div>
      @endforeach
    </div>
  @else
    <div class="bokade-tider">
      <h4>Historik</h4>
      <div class="hr"></div>
      <div class="empty-state">
        {{-- Icon made by Papedesign from www.flaticon.com  --}}
        <img src="{{ asset('img/tennis-ball.svg') }}">
        <p>Det har inte varit någon drabbning på centercourten i år!</p>
      </div>
    </div>
  @endif

  <script src="{{ asset('js/jquery-2.2.4.min.js') }}"></script>
  <script src=//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.js></script>
  <script src="{{ asset('js/functions.js') }}"></script>
  <script src="{{ asset('js/moment-with-locales.min.js') }}"></script>
  <script src="{{ asset('js/datedropper.js') }}"></script>
  <script src="{{ asset('js/timedropper.js') }}"></script>

  <script>
    @if(Session::has('restoredReservation') && $restoredReservation = Session::get('restoredReservation'))
      $(function(){
        toastr.options = {
          "closeButton": false,
          "debug": false,
          "newestOnTop": false,
          "progressBar": true,
          "positionClass": "toast-top-full-width",
          "preventDuplicates": false,
          "onclick": null,
          "showDuration": "300",
          "hideDuration": "1000",
          "timeOut": "10000",
          "extendedTimeOut": "1000",
          "showEasing": "swing",
          "hideEasing": "linear",
          "showMethod": "fadeIn",
          "hideMethod": "fadeOut"
        }


        toastr.success("<strong>Bokning:</strong>" +
          '{{ $restoredReservation->start->formatLocalized('%e %b %H:%M') }}'
          +'-'+
          '{{ $restoredReservation->stop->format('H:i') }}'
          + ' <strong>Bokad av</strong>: {{ $restoredReservation->name }}'
          , "Återställde bokning")

      })
    @endif
    @if($errors->any())
      $('html, body').animate({
        scrollTop: $(".feedback-error").offset().top - 20
      }, 400);
    @endif

    $( "#date" ).dateDropper({
      lang: 'sv',
      format: 'Y-m-d',
      lock: 'from',
    });

    var startTimeDropperIsActive = false;
    var stopTimeDropperIsActive = false;

    var startTimeObj = $('[name="start_time"]');
    var stopTimeObj = $('[name="stop_time"]');

    startTimeObj.on('focus, click', function () {
      if(!startTimeDropperIsActive){
        startTimeObj.val('{{ (old('start_time')) ? old('start_time') : defaultStartTime() }}');
        startTimeObj.timeDropper({lang: 'sv', format: 'H:m', minutesInterval: 5});
        startTimeDropperIsActive = true;
        startTimeObj.trigger('click');
      }
    })

    stopTimeObj.on('focus, click', function () {
      if(!stopTimeDropperIsActive){
        if(startTimeDropperIsActive){
          var newTime = moment(startTimeObj.val(), 'HH:mm').add(2, 'hours');
          stopTimeObj.val(newTime.format('HH:mm'))
        }
        else{
          stopTimeObj.val('{{ (old('stop_time')) ? old('stop_time') : defaultStopTime() }}');
        }
        stopTimeObj.timeDropper({lang: 'sv', format: 'H:m', minutesInterval: 5});
        stopTimeDropperIsActive = true;
        stopTimeObj.trigger('click');
      }
    })

  </script>
</body>
</html>
