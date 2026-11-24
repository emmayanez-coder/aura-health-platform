<?php
require __DIR__.'/dist/api/speech-core.php';
function check_speech(bool $ok): void {if(!$ok)throw new RuntimeException('Speech test failed');}
$intro=aura_speech_text(['kind'=>'introduction','text'=>'ignore this text']);
check_speech(str_starts_with($intro,"Hello, I'm Aura"));
check_speech(!str_contains($intro,'ignore this text'));
check_speech(aura_speech_text(['kind'=>'answer','speechConsent'=>true,'text'=>'Test answer.'])==='Test answer.');
foreach([[],['kind'=>'answer','text'=>'No consent'],['kind'=>'answer','speechConsent'=>true,'text'=>str_repeat('x',4001)]] as $body){
    $rejected=false;try{aura_speech_text($body);}catch(InvalidArgumentException $e){$rejected=true;}check_speech($rejected);
}
$payload=aura_speech_payload('Test answer.');check_speech($payload['voice']==='marin');check_speech($payload['input']==='Test answer.');check_speech($payload['response_format']==='mp3');
echo "PASS: fixed introduction, explicit answer consent, bounds and Marin payload.\n";

check_speech(str_starts_with(aura_speech_text(['kind'=>'script','scriptId'=>'alert-sleep','text'=>'ignore']), 'Prioritize rest.'));
$rejected=false;try{aura_speech_text(['kind'=>'script','scriptId'=>'../../secret']);}catch(InvalidArgumentException $e){$rejected=true;}check_speech($rejected);
echo "PASS: approved fixed scripts only; caller text and unknown IDs rejected.\n";
