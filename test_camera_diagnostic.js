// Script de diagnóstico para problemas de cámara
// Ejecutar en la consola del navegador en la página del escáner

async function runCameraDiagnostic() {
    console.log('🔍 === DIAGNÓSTICO DE CÁMARA ===');

    // 1. Verificar compatibilidad básica
    console.log('1️⃣ Verificando compatibilidad básica...');
    console.log('   navigator.mediaDevices:', !!navigator.mediaDevices);
    console.log('   getUserMedia:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
    console.log('   Protocolo:', window.location.protocol);
    console.log('   Host:', window.location.host);

    // 2. Verificar elemento video
    console.log('2️⃣ Verificando elemento video...');
    const videoElement = document.querySelector('#scanner-video');
    console.log('   Elemento video encontrado:', !!videoElement);
    if (videoElement) {
        console.log('   Dimensiones del elemento:', videoElement.offsetWidth, 'x', videoElement.offsetHeight);
        console.log('   Estilos CSS:', window.getComputedStyle(videoElement));
        console.log('   Atributos actuales:', {
            playsinline: videoElement.getAttribute('playsinline'),
            webkitPlaysinline: videoElement.getAttribute('webkit-playsinline'),
            autoplay: videoElement.getAttribute('autoplay'),
            muted: videoElement.getAttribute('muted'),
            controls: videoElement.getAttribute('controls')
        });
    }

    // 3. Verificar dispositivos disponibles
    console.log('3️⃣ Verificando dispositivos de cámara...');
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('   Cámaras encontradas:', videoDevices.length);
        videoDevices.forEach((device, index) => {
            console.log(`   ${index + 1}. ${device.label} (ID: ${device.deviceId})`);
        });
    } catch (error) {
        console.error('   Error enumerando dispositivos:', error);
    }

    // 4. Probar getUserMedia directamente
    console.log('4️⃣ Probando getUserMedia directamente...');
    try {
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 15 },
                facingMode: 'environment'
            },
            audio: false
        };

        console.log('   Intentando con restricciones:', constraints);

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('   ✅ Stream obtenido exitosamente');
        console.log('   Tracks de video:', stream.getVideoTracks().length);
        console.log('   Tracks de audio:', stream.getAudioTracks().length);

        if (stream.getVideoTracks().length > 0) {
            const videoTrack = stream.getVideoTracks()[0];
            console.log('   Configuración del track de video:', videoTrack.getSettings());
            console.log('   Restricciones del track:', videoTrack.getConstraints());
        }

        // 5. Probar asignar stream al elemento video
        console.log('5️⃣ Probando asignación del stream al video...');
        if (videoElement) {
            // Limpiar stream anterior
            if (videoElement.srcObject) {
                videoElement.srcObject.getTracks().forEach(track => track.stop());
            }

            videoElement.srcObject = stream;
            console.log('   ✅ Stream asignado al elemento video');

            // Esperar a que esté listo
            await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve('timeout'), 5000);

                videoElement.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    console.log('   ✅ Metadata del video cargada');
                    console.log('   Dimensiones del video:', videoElement.videoWidth, 'x', videoElement.videoHeight);
                    resolve('loaded');
                };

                videoElement.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('   ❌ Error en elemento video:', error);
                    resolve('error');
                };
            });

            // Intentar reproducir
            console.log('6️⃣ Intentando reproducir video...');
            try {
                await videoElement.play();
                console.log('   ✅ Video reproduciéndose');
                console.log('   Estado del video:', {
                    videoWidth: videoElement.videoWidth,
                    videoHeight: videoElement.videoHeight,
                    readyState: videoElement.readyState,
                    paused: videoElement.paused,
                    ended: videoElement.ended,
                    currentTime: videoElement.currentTime
                });
            } catch (playError) {
                console.error('   ❌ Error reproduciendo video:', playError);
            }

            // Mantener stream por 10 segundos para inspección
            setTimeout(() => {
                console.log('🛑 Deteniendo stream de diagnóstico...');
                stream.getTracks().forEach(track => track.stop());
                videoElement.srcObject = null;
                console.log('✅ Stream detenido');
            }, 10000);

        } else {
            console.log('   ⚠️ No se encontró elemento video, deteniendo stream');
            stream.getTracks().forEach(track => track.stop());
        }

    } catch (error) {
        console.error('   ❌ Error en getUserMedia:', error);
        console.log('   Nombre del error:', error.name);
        console.log('   Mensaje:', error.message);

        // Diagnóstico específico por tipo de error
        if (error.name === 'NotAllowedError') {
            console.log('   💡 SOLUCIÓN: El usuario negó el permiso. Debe hacer clic en "Permitir" cuando aparezca el mensaje.');
        } else if (error.name === 'NotFoundError') {
            console.log('   💡 SOLUCIÓN: No se encontró cámara. Verificar que el dispositivo tenga cámara.');
        } else if (error.name === 'NotReadableError') {
            console.log('   💡 SOLUCIÓN: La cámara está siendo usada por otra aplicación. Cerrar otras apps que usen cámara.');
        } else if (error.name === 'OverconstrainedError') {
            console.log('   💡 SOLUCIÓN: Las restricciones de video no son soportadas. Intentar con configuración más básica.');
        } else if (error.name === 'AbortError') {
            console.log('   💡 SOLUCIÓN: El acceso fue cancelado. Reintentar la solicitud.');
        }
    }

    console.log('🔍 === FIN DEL DIAGNÓSTICO ===');
}

// Función para probar diferentes configuraciones de video
async function testVideoConfigurations() {
    console.log('🎥 === PRUEBA DE CONFIGURACIONES DE VIDEO ===');

    const configurations = [
        { name: 'Básica', constraints: { video: true, audio: false } },
        { name: 'Estándar', constraints: { video: { width: 1280, height: 720 }, audio: false } },
        { name: 'Móvil', constraints: { video: { facingMode: 'environment' }, audio: false } },
        { name: 'Baja resolución', constraints: { video: { width: 640, height: 480 }, audio: false } }
    ];

    for (const config of configurations) {
        console.log(`\n🧪 Probando configuración: ${config.name}`);
        try {
            const stream = await navigator.mediaDevices.getUserMedia(config.constraints);
            console.log(`   ✅ ${config.name}: Éxito`);
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            console.log(`   ❌ ${config.name}: ${error.name} - ${error.message}`);
        }
    }

    console.log('🎥 === FIN DE PRUEBAS ===');
}

// Función para verificar estado del elemento video en tiempo real
function monitorVideoElement() {
    const videoElement = document.querySelector('#scanner-video');
    if (!videoElement) {
        console.log('❌ No se encontró elemento video');
        return;
    }

    console.log('📊 Monitoreando elemento video cada 1 segundo...');

    const interval = setInterval(() => {
        console.log('📊 Estado del video:', {
            offsetWidth: videoElement.offsetWidth,
            offsetHeight: videoElement.offsetHeight,
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            readyState: videoElement.readyState,
            paused: videoElement.paused,
            ended: videoElement.ended,
            currentTime: videoElement.currentTime,
            srcObject: !!videoElement.srcObject,
            visibility: window.getComputedStyle(videoElement).visibility,
            display: window.getComputedStyle(videoElement).display,
            opacity: window.getComputedStyle(videoElement).opacity
        });
    }, 1000);

    // Detener monitoreo después de 10 segundos
    setTimeout(() => {
        clearInterval(interval);
        console.log('⏹️ Monitoreo detenido');
    }, 10000);
}

// Función para probar reproducción de video con diferentes métodos
async function testVideoPlayback() {
    console.log('🎬 === PRUEBA DE REPRODUCCIÓN DE VIDEO ===');

    const videoElement = document.querySelector('#scanner-video');
    if (!videoElement) {
        console.log('❌ No se encontró elemento video');
        return;
    }

    try {
        // Crear stream de prueba
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false
        });

        console.log('✅ Stream obtenido');

        // Limpiar stream anterior
        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }

        // Configurar atributos del video
        videoElement.setAttribute('playsinline', 'true');
        videoElement.setAttribute('webkit-playsinline', 'true');
        videoElement.setAttribute('autoplay', 'true');
        videoElement.setAttribute('muted', 'true');
        videoElement.setAttribute('controls', 'false');

        // Asignar stream
        videoElement.srcObject = stream;
        console.log('✅ Stream asignado');

        // Esperar metadata
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout esperando metadata')), 5000);

            videoElement.onloadedmetadata = () => {
                clearTimeout(timeout);
                console.log('✅ Metadata cargada');
                resolve();
            };

            videoElement.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };
        });

        // Intentar diferentes métodos de reproducción
        console.log('🎯 Intentando reproducción...');

        try {
            await videoElement.play();
            console.log('✅ Reproducción exitosa con video.play()');
        } catch (error) {
            console.log('❌ Error con video.play():', error);

            // Intentar con click del usuario
            console.log('👆 Intentando con interacción del usuario...');
            videoElement.addEventListener('click', async () => {
                try {
                    await videoElement.play();
                    console.log('✅ Reproducción exitosa después de click');
                } catch (clickError) {
                    console.log('❌ Error incluso después de click:', clickError);
                }
            });
            console.log('   Haz clic en el video para intentar reproducir');
        }

        // Monitorear por 5 segundos
        let count = 0;
        const monitor = setInterval(() => {
            count++;
            console.log(`📊 Estado ${count}s:`, {
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight,
                readyState: videoElement.readyState,
                paused: videoElement.paused
            });

            if (count >= 5) {
                clearInterval(monitor);
                stream.getTracks().forEach(track => track.stop());
                videoElement.srcObject = null;
                console.log('🛑 Prueba de reproducción terminada');
            }
        }, 1000);

    } catch (error) {
        console.error('❌ Error en prueba de reproducción:', error);
    }

    console.log('🎬 === FIN DE PRUEBA ===');
}

// Exponer funciones globalmente para usar en consola
window.runCameraDiagnostic = runCameraDiagnostic;
window.testVideoConfigurations = testVideoConfigurations;
window.monitorVideoElement = monitorVideoElement;
window.testVideoPlayback = testVideoPlayback;

console.log('🔧 Funciones de diagnóstico disponibles:');
console.log('   runCameraDiagnostic() - Diagnóstico completo');
console.log('   testVideoConfigurations() - Probar diferentes configuraciones');
console.log('   monitorVideoElement() - Monitorear estado del video');
console.log('   testVideoPlayback() - Probar reproducción de video');
console.log('💡 Ejecuta runCameraDiagnostic() para comenzar el diagnóstico');