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
    
    async function cloneVoice(audioBlob) {
        console.log('Starting voice cloning...');
        
        const formData = new FormData();
        formData.append('name', 'User Voice');
        formData.append('files', audioBlob);
        formData.append('description', 'Voice cloned from user upload');
        
        try {
            // 将音频文件转换为base64编码
            const base64Audio = await blobToBase64(audioBlob);
            
            const response = await fetch('/api/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: 'voices/add',
                    method: 'POST',
                    body: {
                        name: 'User Voice',
                        files: [base64Audio],
                        description: 'Voice cloned from user upload'
                    }
                })
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
    
    // 辅助函数：将Blob转换为base64
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    async function generateSpeech(text, voiceId) {
        console.log('Generating speech for text:', text);
        console.log('Using voice ID:', voiceId);
        
        try {
            const response = await fetch('/api/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: 'text-to-speech',
                    method: 'POST',
                    voiceId: voiceId,
                    body: {
                        text: text,
                        model_id: 'eleven_monolingual_v1',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75
                        }
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail?.message || 'Failed to generate speech');
            }
            
            const audioBlob = await response.blob();
            // 新增上传接口
const audioUploadUrl = await uploadAudioToVercel(audioBlob);
return audioUploadUrl;
        } catch (error) {
            console.error('Speech generation error:', error);
            throw error;
        }
    }
    
    async function generateVideo(photoBlob, audioURL, text) {
        console.log('Starting video generation...');
        
        try {
            // 将照片转换为base64编码
            const base64Photo = await blobToBase64(photoBlob);
            
            // 上传照片
            const photoResponse = await fetch('/api/did', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: 'images',
                    method: 'POST',
                    body: {
                        image: base64Photo
                    }
                })
            });
            
            if (!photoResponse.ok) {
                const errorData = await photoResponse.json();
                throw new Error(errorData.message || 'Failed to upload photo');
            }
            
            const photoData = await photoResponse.json();
            const photoUrl = photoData.url;
            console.log('Photo uploaded successfully:', photoUrl);
            
            // 创建视频
            const videoResponse = await fetch('/api/did', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: 'talks',
                    method: 'POST',
                    body: {
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
            
            // 轮询视频生成状态
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
            await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
            console.log(`Checking video status, attempt ${attempts + 1}/${maxAttempts}`);
            
            try {
                const statusResponse = await fetch('/api/did', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: `talks/${talkId}`,
                        method: 'GET'
                    })
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
    async function uploadAudioToVercel(blob) {
        const formData = new FormData();
        formData.append("file", blob, "audio.mp3");
      
        const response = await fetch("/api/upload-audio", {
          method: "POST",
          body: formData
        });
      
        const result = await response.json();
        if (!result.url) {
          throw new Error("Audio upload failed: No URL returned");
        }
      
        return result.url; // 👈 这就是我们传给 D-ID 的 audio URL
      }

});