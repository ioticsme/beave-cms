importScripts('https://www.gstatic.com/firebasejs/8.2.0/firebase-app.js')
importScripts('https://www.gstatic.com/firebasejs/8.2.0/firebase-messaging.js')

const firebaseConfig = {
    apiKey: 'AIzaSyAhSAoyALiS9V11Ienz7dzmGwOHdb-vx4I',
    authDomain: 'experiment-d4168.firebaseapp.com',
    projectId: 'experiment-d4168',
    storageBucket: 'experiment-d4168.appspot.com',
    messagingSenderId: '455789068269',
    appId: '1:455789068269:web:5552e7cbb0a6bf0970b1e4',
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()
messaging.onBackgroundMessage(function (payload) {
    console.log(
        '[firebase-messaging-sw.js] Received background message ',
        payload
    )
    // Customize notification here
    const notificationTitle = 'Title'
    const notificationOptions = {
        body: payload,
        icon: '/firebase-logo.png',
    }
    self.registration.showNotification(notificationTitle, notificationOptions)
})
;``