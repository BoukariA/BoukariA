/*
 * Focus Dashboard – instellingen
 * ------------------------------------------------------------------
 * Pas hier je ochtendsessie, de focus-timer en je app-tegels aan.
 * Na een wijziging: opnieuw verpakken en installeren (zie README).
 */
window.APP_CONFIG = {
  /* Ochtendsessie: de stappen die je elke ochtend afvinkt (in minuten). */
  routine: {
    title: 'Ochtendsessie',
    steps: [
      { name: 'Buiten lopen', minutes: 15 },
      { name: 'Stretchen', minutes: 5 },
      { name: 'Ontbijten', minutes: 15 },
      { name: 'Mediteren', minutes: 10 }
    ]
  },

  /* Focus-timer (pomodoro). */
  focus: {
    focusMinutes: 25,      // lengte van een focussessie
    shortBreakMinutes: 5,  // korte pauze na een sessie
    longBreakMinutes: 15,  // lange pauze ...
    longBreakEvery: 4,     // ... na elke 4e sessie
    dailyGoal: 4,          // aantal sessies per dag (de bolletjes)
    extendMinutes: 5       // knop "+5 min"
  },

  /* Zacht geluidssignaal als een stap of sessie voorbij is. */
  sound: true,

  /*
   * App-tegels, in deze volgorde onderaan het dashboard.
   *  - name:    tekst op de tegel én de naam waarop de app op je TV wordt gezocht
   *  - id:      de webOS app-ID. Laat leeg ('') als je die niet weet: het dashboard
   *             probeert de app dan op naam te vinden. Lukt dat niet, dan toont de
   *             tegel "ID instellen". Zie README > "App-ID's vinden".
   *  - aliases: andere namen waaronder de app op je TV kan heten
   *  - params:  (optioneel) extra startparameters, bijv. { target: 'https://...' }
   */
  apps: [
    { name: 'Disney+', id: 'com.disney.disneyplus-prod' },
    { name: 'Apple TV', id: 'com.apple.appletv' },
    { name: 'HBO Max', id: '', aliases: ['Max'] },
    { name: 'Canal+', id: '', aliases: ['Canal Plus', 'CANAL+ NL'] },
    { name: 'NPO Start', id: '', aliases: ['NPO'] },
    { name: 'Prime Video', id: 'amazon', aliases: ['Amazon Prime Video'] },
    { name: 'Netflix', id: 'netflix' },
    { name: 'YouTube', id: 'youtube.leanback.v4' },
    { name: 'SkyShowtime', id: '', aliases: ['SkyShowtime NL'] },
    { name: 'Webbrowser', id: 'com.webos.app.browser', icon: 'globe', aliases: ['Web Browser', 'Internet'] },
    { name: 'Pathé Thuis', id: '', aliases: ['Pathe Thuis'] }
  ]
};
