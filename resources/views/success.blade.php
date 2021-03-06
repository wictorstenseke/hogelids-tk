<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="_token" content="{{ csrf_token() }}" />
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32">
  <link rel="icon" type="image/png" href="/favicon-16x16.png" sizes="16x16">
  <link rel="manifest" href="/manifest.json">
  <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5">
  <meta name="theme-color" content="#ffffff">

  <link href='https://fonts.googleapis.com/css?family=Roboto+Condensed:400,300,300italic,400italic,700' rel='stylesheet' type='text/css'>
  <title>Boka banan | Högelids Tennisklubb</title>

  <link rel="stylesheet" href="{{ asset('css/main.css') }}">

</head>
<body>
  <div class="bildbox">
    <a href="{{ action('ReservationController@index') }}">
      <img src="{{ asset('img/htk-logo.svg') }}" alt="" class="logotype">
    </a>
  </div>

  <div class="bokade-tider">
    <h4>Bokning mottagen!</h4>
    <h1><i class="fa fa-thumbs-up animated tada"></i></h1>
    <div class="info-reservation">
      <p>Bokad av: <span class="bold-text">{{ $createdReservation->name }}</span></p>
      <div class="hr2"></div>
      <p>Bokad från: <span class="bold-text">{{ $createdReservation->start->formatLocalized('%e %b %H:%M') }}</span></p>
      <p>Bokad till: <span class="bold-text">{{ $createdReservation->stop->formatLocalized('%e %b %H:%M') }}</span></p>
    </div>
    <a href="{{ action('ReservationController@index') }}" class="cta-button">Klar</a>
  </div>
</body>
</html>
