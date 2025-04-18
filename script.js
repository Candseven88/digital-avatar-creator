document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const voiceFileInput = document.getElementById('voice-file');
    const recordButton = document.getElementById('record-button');
    const stopRecordButton = document.getElementById('stop-recording');
    const recordingControls = document.getElementById('recording-controls');
    const timer = document.getElementById('timer');
    const voicePreview = document.getElementById('voice-preview');
    const voiceFilename = document.getElementById('voice-filename');
    const audioPlayer = document.getElementById('audio-player');
    
    const photoFileInput = document.getElementById('photo-file');
    const photoPreview = document.getElementById('photo-preview');
    const imagePreview = document.getElementById('image-preview');
    
    const avatarText = document.getElementById('avatar-text');
    const generateButton = document.getElementById('generate-button');
    const loadingIndicator = document.getElementById('loading');
    const resultSection = document.getElementById('result-section');
    const resultVideo = document.getElementById('result-video');
    const downloadButton = document.getElementById('download-button');
    
    // API Keys - 替换成您的实际API密钥
    const ELEVENLABS_API_KEY = 'sk_317aed3fe6fedcc24dbd0eae70f76772977947c830cfe2cc';
    const DID_API_KEY = 'Y2FuZHNldmVuMjAxNUBnbWFpbC5jb20:QnYUpcYj03bFmFjGawzUE';
    
    // Global variables
    let mediaRecorder;
    let audioChunks = [];
    let recordingTimer;
    let recordingTimeCount = 0;
    let voiceBlob;
    let photoBlob;
    let voiceId = null;
    
    // Handle file upload for voice
    voiceFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            voiceBlob = file;
            voiceFilename.textContent = file.name;
            
            const audioURL = URL.createObjectURL(file);
            audioPlayer.src = audioURL;
            
            voicePreview.classList.remove('hidden');
        }
    });
    
    // Handle voice recording
    recordButton.addEventListener('click', startRecording);
    stopRecordButton.addEventListener('click', stopRecording);
    
    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
                audioChunks = [];
                recordingTimeCount = 0;
                
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.addEventListener('dataavailable', function(e) {
                    audioChunks.push(e.data);
                });
                
                mediaRecorder.addEventListener('stop', function() {
                    voiceBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioURL = URL.createObjectURL(voiceBlob);
                    audioPlayer.src = audioURL;
                    voiceFilename.textContent = 'Recorded Audio';
                    
                    voicePreview.classList.remove('hidden');
                    recordButton.classList.remove('hidden');
                    recordingControls.classList.add('hidden');
                    
                    // Stop all tracks in the stream
                    stream.getTracks().forEach(track => track.stop());
                });
                
                mediaRecorder.start();
                
                // Start timer
                updateTimer();
                recordingTimer = setInterval(updateTimer, 1000);
                
                // Show recording controls
                recordButton.classList.add('hidden');
                recordingControls.classList.remove('hidden');
                
                // Limit recording to 30 seconds
                setTimeout(() => {
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        stopRecording();
                    }
                }, 30000);
            })
            .catch(function(err) {
                alert('Error accessing microphone: ' + err.message);
            });
    }
    
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            clearInterval(recordingTimer);
        }
    }
    
    function updateTimer() {
        recordingTimeCount++;
        const minutes = Math.floor(recordingTimeCount / 60);
        const seconds = recordingTimeCount % 60;
        timer.textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    }
    
    // Handle file upload for photo
    photoFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            photoBlob = file;
            
            const photoURL = URL.createObjectURL(file);
            imagePreview.src = photoURL;
            
            photoPreview.classList.remove('hidden');
        }
    });
    
    // Generate button click event
    generateButton.addEventListener('click', generateAvatar);
    
    async function generateAvatar() {
        // Validate inputs
        if (!voiceBlob) {
            alert('Please upload or record a voice file.');
            return;
        }
        
        if (!photoBlob) {
            alert('Please upload a photo.');
            return;
        }
        
        const text = avatarText.value.trim();
        if (!text) {
            alert('Please enter some text for your avatar to speak.');
            return;
        }
        
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        generateButton.disabled = true;
        
        try {
            // Step 1: Clone voice using ElevenLabs API
            voiceId = await cloneVoice(voiceBlob);
            console.log("Voice cloned successfully, ID:", voiceId);
            
            // Step 2: Generate speech from text using the cloned voice
            const audioURL = await generateSpeech(text, voiceId);
            console.log("Speech generated successfully");
            
            // Step 3: Generate avatar video using the photo and speech audio
            const videoURL = await generateVideo(photoBlob, audioURL, text);
            console.log("Video generated successfully:", videoURL);
            
            // Display result
            resultVideo.src = videoURL;
            resultSection.classList.remove('hidden');
            
            // Setup download button
            downloadButton.onclick = function() {
                const a = document.createElement('a');
                a.href = videoURL;
                a.download = 'digital-avatar.mp4';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
        } catch (error) {
            alert('Error generating avatar: ' + error.message);
            console.error("Error details:", error);
        } finally {
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            generateButton.disabled = false;
        }
    }
    
    // API functions
    async function cloneVoice(audioBlob) {
        console.log('Starting voice cloning...');
        
        const formData = new FormData();
        formData.append('name', 'User Voice');
        formData.append('files', audioBlob);
        formData.append('description', 'Voice cloned from user upload');
        
        try {
            const response = await fetch('https://cors-anywhere.herokuapp.com/https://api.elevenlabs.io/v1/voices/add', {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail?.message || 'Failed to clone voice');
            }
            
            const data = await response.json();
            return data.voice_id;
        } catch (error) {
            console.error('Voice cloning error:', error);
            throw error;
        }
    }
    
    async function generateSpeech(text, voiceId) {
        console.log('Generating speech for text:', text);
        console.log('Using voice ID:', voiceId);
        
        try {
            const response = await fetch(`https://cors-anywhere.herokuapp.com/https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail?.message || 'Failed to generate speech');
            }
            
            const audioBlob = await response.blob();
            return URL.createObjectURL(audioBlob);
        } catch (error) {
            console.error('Speech generation error:', error);
            throw error;
        }
    }
    
    async function generateVideo(photoBlob, audioURL, text) {
        console.log('Starting video generation...');
        
        try {
            // First, upload the photo to get a photo URL
            const photoFormData = new FormData();
            photoFormData.append('image', photoBlob);
            
            const photoResponse = await fetch('https://cors-anywhere.herokuapp.com/https://api.d-id.com/images', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${DID_API_KEY}`,
                },
                body: photoFormData
            });
            
            if (!photoResponse.ok) {
                const errorData = await photoResponse.json();
                throw new Error(errorData.message || 'Failed to upload photo');
            }
            
            const photoData = await photoResponse.json();
            const photoUrl = photoData.url;
            console.log('Photo uploaded successfully:', photoUrl);
            
            // Now create the talking avatar video
            const videoResponse = await fetch('https://cors-anywhere.herokuapp.com/https://api.d-id.com/talks', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${DID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    script: {
                        type: 'audio',
                        audio_url: audioURL,
                        ssml: false
                    },
                    source_url: photoUrl,
                    config: {
                        fluent: true,
                        pad_audio: 0.3
                    }
                })
            });
            
            if (!videoResponse.ok) {
                const errorData = await videoResponse.json();
                throw new Error(errorData.message || 'Failed to generate video');
            }
            
            const videoData = await videoResponse.json();
            const talkId = videoData.id;
            console.log('Video generation started, talk ID:', talkId);
            
            // Poll for the status of the video generation
            return await pollForVideoCompletion(talkId);
        } catch (error) {
            console.error('Video generation error:', error);
            throw error;
        }
    }
    
    async function pollForVideoCompletion(talkId) {
        console.log('Polling for video completion...');
        
        const maxAttempts = 20;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            console.log(`Checking video status, attempt ${attempts + 1}/${maxAttempts}`);
            
            try {
                const statusResponse = await fetch(`https://cors-anywhere.herokuapp.com/https://api.d-id.com/talks/${talkId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${DID_API_KEY}`,
                    }
                });
                
                if (!statusResponse.ok) {
                    attempts++;
                    continue;
                }
                
                const statusData = await statusResponse.json();
                console.log('Video status:', statusData.status);
                
                if (statusData.status === 'done') {
                    console.log('Video generation completed');
                    return statusData.result_url;
                } else if (statusData.status === 'failed') {
                    throw new Error('Video generation failed');
                }
            } catch (error) {
                console.error('Error checking video status:', error);
            }
            
            attempts++;
        }
        
        throw new Error('Video generation timed out');
    }
});