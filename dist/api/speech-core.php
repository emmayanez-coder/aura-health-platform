<?php
declare(strict_types=1);
function aura_speech_text(array $body): string {
    if(($body['kind']??'')==='introduction')return "Hello, I'm Aura, your AI health companion. I'm here to help you understand your readings, explore your health concerns, and support your daily wellbeing during your mission. Let's review your data together. For medical decisions or urgent concerns, contact your medical support team.";
    if(($body['kind']??'')==='script'){
        $scripts=json_decode(file_get_contents(__DIR__.'/voice-scripts.json'),true);
        $id=$body['scriptId']??'';
        if(!is_string($id)||!isset($scripts[$id]))throw new InvalidArgumentException('Unknown narration.');
        return $scripts[$id];
    }
    if(($body['kind']??'')!=='answer'||($body['speechConsent']??false)!==true)throw new InvalidArgumentException('Confirm speech sharing before reading an AI answer.');
    $text=$body['text']??null;
    if(!is_string($text)||trim($text)===''||strlen($text)>16000)throw new InvalidArgumentException('Answer is missing or too long for speech. Ask AURA for a shorter summary.');
    $length=preg_match_all('/./us',$text);
    if($length===false||$length>4000)throw new InvalidArgumentException('Answer is too long for speech. Ask AURA for a shorter summary.');
    return $text;
}
function aura_speech_payload(string $text): array {
    return ['model'=>'gpt-4o-mini-tts','voice'=>'marin','input'=>$text,'response_format'=>'mp3','instructions'=>'Speak in a warm, natural, reassuring conversational voice. Be calm and clear, with gentle expression and natural pauses. Avoid a robotic or theatrical delivery. Read the supplied text faithfully without adding medical advice. Pronounce AURA as aura.'];
}
