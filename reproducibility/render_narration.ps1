param([string]$AURAProject)
Add-Type -AssemblyName System.Speech
$auraNarration = Get-Content -LiteralPath (Join-Path $AURAProject 'narration.json') -Raw | ConvertFrom-Json
$auraAudioDir = Join-Path $AURAProject 'dist/audio/medical-assist'
New-Item -ItemType Directory -Force -Path $auraAudioDir | Out-Null
$auraVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$auraVoice.SelectVoice('Microsoft Zira Desktop')
$auraVoice.Rate = -1
$auraVoice.Volume = 100
$auraFormat = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
try {
  foreach ($auraClip in $auraNarration.steps) {
    $auraOutput = Join-Path $auraAudioDir $auraClip.audio
    $auraVoice.SetOutputToWaveFile($auraOutput, $auraFormat)
    $auraVoice.Speak($auraClip.text)
    $auraVoice.SetOutputToNull()
  }
} finally { $auraVoice.Dispose() }
Write-Output 'Created five prerecorded narration WAV files.'
