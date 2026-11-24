<?php
declare(strict_types=1);
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Vary: Cookie');
function aura_reply(int $status,array $body): never {http_response_code($status);echo json_encode($body,JSON_UNESCAPED_SLASHES);exit;}
$auraStage='BOOT';
set_exception_handler(function(Throwable $e){
    global $auraStage;
    // Report only a fixed stage code, never exception text, paths or configuration contents.
    $messages=['BOOT'=>'PHP initialization failed.','WORDPRESS'=>'WordPress could not load. Ask hosting support to check wp-load.php and its PHP error log.','AUTH'=>'WordPress login functions could not run.','PRIVATE_PATH'=>'PHP could not inspect the private folder. Ask hosting support to check filesystem access.','CONFIG'=>'The private configuration could not load.','SETTINGS'=>'The private configuration has invalid settings.','NONCE'=>'WordPress could not create a login nonce.','REQUEST'=>'The request could not be validated.','QUOTA'=>'The private request counter could not be read or written.','OPENAI'=>'The server could not complete the OpenAI request.'];
    $stage=array_key_exists($auraStage,$messages)?$auraStage:'BOOT';
    aura_reply(500,['error'=>'AURA-'.$stage.': '.$messages[$stage].' PHP '.PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION.'.']);
});
if(PHP_VERSION_ID<80100)aura_reply(503,['error'=>'AURA-PHP: PHP 8.1 or newer is required. Ask hosting support to update the site PHP version.']);
$auraHttpMethod=$_SERVER['REQUEST_METHOD']??'';
if(!in_array($auraHttpMethod,['GET','POST'],true))aura_reply(405,['error'=>'Method not allowed.']);
$auraWordPressBootstrap=dirname(__DIR__,2).'/wp-load.php'; // Never assign to WordPress's global $wp.
if(!is_file($auraWordPressBootstrap))aura_reply(503,['error'=>'WordPress was not found beside the dashboard folder. Check the documented hosting layout.']);
if(!defined('DONOTCACHEPAGE'))define('DONOTCACHEPAGE',true);
$auraStage='WORDPRESS';
// Keep normal WordPress global bootstrap scope, but use AURA-prefixed variables.
$auraBufferLevel=ob_get_level();
ob_start();
try {
    require_once $auraWordPressBootstrap;
    while(ob_get_level()>$auraBufferLevel)ob_end_clean();
} catch(Throwable $auraBootstrapError) {
    while(ob_get_level()>$auraBufferLevel)ob_end_clean();
    // Filename/line and a fixed category only; never return the raw error message,
    // stack trace, full filesystem path, database configuration or credentials.
    $auraErrorFile=preg_replace('/[^a-zA-Z0-9_.-]/','',basename($auraBootstrapError->getFile()));
    $auraErrorKind=$auraBootstrapError instanceof ParseError?'PHP syntax error':($auraBootstrapError instanceof TypeError?'PHP type error':'PHP loading error');
    aura_reply(503,['error'=>'AURA-WORDPRESS-LOAD: '.$auraErrorKind.' in '.$auraErrorFile.' at line '.$auraBootstrapError->getLine().'. Your WordPress login can still work independently. Share this diagnostic code, not file contents.']);
}
$auraStage='AUTH';
$auraIsAdmin=is_user_logged_in()&&current_user_can('manage_options');
if(!$auraIsAdmin){
    require_once __DIR__.'/public-access.php';
    aura_public_access_limit();
}
// No CORS. Bind POST to the site's configured HTTPS origin and a user-specific nonce.
$home=parse_url(home_url('/'));
$origin=($home['scheme']??'').'://'.($home['host']??'').(isset($home['port'])?':'.$home['port']:'');
if(($home['scheme']??'')!=='https')aura_reply(503,['error'=>'Cloud companion requires the WordPress site URL to use HTTPS.']);
if($auraHttpMethod==='POST') {
    if(($_SERVER['HTTP_ORIGIN']??'')!==$origin)aura_reply(403,['error'=>'Use the dashboard on the same address as your WordPress site.']);
    if(!wp_verify_nonce($_SERVER['HTTP_X_AURA_NONCE']??'','aura_chat'))aura_reply(403,['error'=>'Session expired. Check connection and send again.']);
}
$auraUseWordPressSettings=function_exists('aura_companion_site_config');
if($auraUseWordPressSettings){
    $auraStage='CONFIG';
    try {$config=aura_companion_site_config();}
    catch(Throwable $e){aura_reply(503,['error'=>'AURA settings could not be decrypted. Open WordPress Settings > AURA Companion and save the key again.']);}
    if(!is_array($config))aura_reply(503,['error'=>'Open WordPress Settings > AURA Companion and save your OpenAI API key.']);
} else {
$auraStage='PRIVATE_PATH';
$siteParent=dirname(__DIR__,3);
$publicRoot=realpath(dirname(__DIR__,2));
require_once __DIR__.'/private-paths.php';
$auraCandidates=[$siteParent.'/homedir/aura-private',$siteParent.'/aura-private','/homedir/aura-private'];
$auraHome=getenv('HOME');
if(is_string($auraHome)&&$auraHome!==''&&$auraHome[0]==='/')$auraCandidates[]=rtrim($auraHome,'/').'/aura-private';
$auraDocumentRoot=$_SERVER['DOCUMENT_ROOT']??'';
if($auraDocumentRoot!=='')$auraCandidates[]=dirname($auraDocumentRoot).'/aura-private';
if(defined('ABSPATH'))$auraCandidates[]=dirname(rtrim(ABSPATH,'/\\')).'/aura-private';
$auraPublicRoots=[dirname(__DIR__,2)];
if($auraDocumentRoot!=='')$auraPublicRoots[]=$auraDocumentRoot;
if(defined('ABSPATH'))$auraPublicRoots[]=ABSPATH;
$auraPaths=aura_find_private($auraCandidates,$auraPublicRoots);
// Authenticated administrator-only diagnostics. No configuration is read or executed.
if($auraIsAdmin&&$auraHttpMethod==='GET'&&($_GET['diagnostics']??'')==='paths')aura_reply(200,[
    'diagnostic'=>'AURA private path check; no key contents read',
    'php_dashboard_root'=>dirname(__DIR__,2),
    'php_document_root'=>$auraDocumentRoot,
    'php_home'=>$auraHome?:null,
    'php_open_basedir'=>ini_get('open_basedir')?:null,
    'checks'=>$auraPaths['checks'],
    'configuration_found'=>$auraPaths['selected']!==null
]);
$private=$auraPaths['selected']['directory']??null;
$configFile=$auraPaths['selected']['config']??null;
if($configFile===null)aura_reply(503,['error'=>'Private config not found. Upload config.php to /homedir/aura-private/ in FileZilla. If it is already there, ask hosting support to confirm the PHP-visible private path.']);
$auraStage='CONFIG';
// Discard accidental output, including a key pasted outside PHP tags.
ob_start();
try {
    $config=require $configFile;
    $configOutput=ob_get_clean();
} catch(ParseError $e) {
    ob_end_clean();
    aura_reply(503,['error'=>'AURA-CONFIG-SYNTAX: config.php contains invalid PHP at line '.$e->getLine().'. Recreate it from the supplied template; keep the key inside straight single quotes. Do not share the key.']);
} catch(Throwable $e) {
    ob_end_clean();
    aura_reply(503,['error'=>'AURA-CONFIG-LOAD: config.php could not load. Use the supplied return-array template and keep values inside quotes as shown. If the format is correct, ask hosting support to check file access. Do not share the key.']);
}
if($configOutput!==''||!is_array($config))aura_reply(503,['error'=>'AURA-CONFIG-FORMAT: config.php must begin with <?php and return the settings array, without printed text. Recreate it from the supplied template.']);
unset($configOutput);
}
$auraStage='SETTINGS';
$key=$config['api_key']??'';$model=$config['model']??'gpt-5.6-terra';
if(!is_string($key)||strlen($key)<20||str_contains($key,'PASTE_'))aura_reply(503,['error'=>'Add your OpenAI API key in the private configuration file.']);
if(!is_string($model)||!preg_match('/^[a-zA-Z0-9._-]{1,80}$/',$model))aura_reply(503,['error'=>'Invalid model configuration.']);
if(!function_exists('curl_init'))aura_reply(503,['error'=>'PHP cURL is required. Ask hosting support to enable it.']);
// The POST path verifies actual file access; is_writable() can misreport ACLs on some hosts.
$auraStage='NONCE';
if($auraHttpMethod==='GET')aura_reply(200,['nonce'=>wp_create_nonce('aura_chat'),'ready'=>true,'access'=>$auraIsAdmin?'administrator':'public']);
$auraStage='REQUEST';
if(stripos($_SERVER['CONTENT_TYPE']??'','application/json')!==0)aura_reply(415,['error'=>'JSON required.']);
$raw=file_get_contents('php://input',false,null,0,48001);
if($raw===false||strlen($raw)>48000)aura_reply(413,['error'=>'Message too large. Clear the conversation.']);
$body=json_decode($raw,true);
if(!is_array($body))aura_reply(400,['error'=>'Invalid JSON.']);
require_once __DIR__.'/chat-core.php';
$auraSpeech=defined('AURA_SPEECH_REQUEST')&&AURA_SPEECH_REQUEST===true;
try {
    if($auraSpeech){
        if(gmdate('Y-m-d')>='2027-01-06')aura_reply(503,['error'=>'This speech integration needs an API upgrade. Typed chat is still available.']);
        require_once __DIR__.'/speech-core.php';$auraSpeechText=aura_speech_text($body);
    } else {$validated=aura_validate($body);}
}catch(InvalidArgumentException $e){aura_reply(400,['error'=>$e->getMessage()]);}
// Atomic site-wide quota. Only counts/time are stored, never questions or health data.
$auraStage='QUOTA';
if($auraUseWordPressSettings){
    try {aura_companion_reserve_request((int)($config['daily_request_limit']??100));}
    catch(OverflowException $e){aura_reply(429,['error'=>'AURA request limit reached: 6 per UTC minute or your daily cap. Wait before retrying.']);}
    catch(Throwable $e){aura_reply(503,['error'=>'WordPress request counters are unavailable. Ask hosting support to check database writes.']);}
} else {
$lock=@fopen($private.'/request-counts.json','c+');
if(!$lock||!flock($lock,LOCK_EX))aura_reply(503,['error'=>'Request limits unavailable. Check private directory permissions.']);
$stored=stream_get_contents($lock);$counts=$stored===''?[]:json_decode($stored,true);
if(!is_array($counts)){flock($lock,LOCK_UN);fclose($lock);aura_reply(503,['error'=>'Request counter needs administrator attention.']);}
$now=time();$day=gmdate('Y-m-d');
$recent=array_values(array_filter($counts['recent']??[],fn($t)=>is_int($t)&&$t>$now-60));
$daily=($counts['day']??'')===$day?(int)($counts['count']??0):0;
$limit=max(1,min(1000,(int)($config['daily_request_limit']??100)));
if(count($recent)>=6||$daily>=$limit){flock($lock,LOCK_UN);fclose($lock);aura_reply(429,['error'=>'AURA request limit reached (6/minute or daily cap). Wait or review your private configuration.']);}
$recent[]=$now;$encoded=json_encode(['day'=>$day,'count'=>$daily+1,'recent'=>$recent]);
rewind($lock);$ok=ftruncate($lock,0)&&fwrite($lock,$encoded)===strlen($encoded)&&fflush($lock);flock($lock,LOCK_UN);fclose($lock);
if(!$ok)aura_reply(503,['error'=>'Could not save the request counter.']);
}
$auraStage='OPENAI';
$curl=curl_init($auraSpeech?'https://api.openai.com/v1/audio/speech':'https://api.openai.com/v1/responses');
curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>55,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$key,'Content-Type: application/json'],CURLOPT_POSTFIELDS=>json_encode($auraSpeech?aura_speech_payload($auraSpeechText):aura_payload($validated,$model))]);
$response=curl_exec($curl);$code=(int)curl_getinfo($curl,CURLINFO_HTTP_CODE);$auraResponseType=(string)curl_getinfo($curl,CURLINFO_CONTENT_TYPE);curl_close($curl);
// Do not echo provider errors, credentials or request bodies.
if($response===false)aura_reply(502,['error'=>'Could not reach OpenAI. Check hosting outbound HTTPS and try later.']);
if($code===401||$code===403)aura_reply(502,['error'=>'OpenAI rejected the credentials or model access. Check your API project configuration.']);
if($code===429)aura_reply(429,['error'=>'OpenAI quota or rate limit reached. Check your API account billing and usage.']);
if($code<200||$code>=300)aura_reply(502,['error'=>'OpenAI request failed. Check the configured model and account access.']);
if($auraSpeech){
    if(strlen($response)<100||strlen($response)>8000000||(!str_starts_with($auraResponseType,'audio/')&&!str_starts_with($auraResponseType,'application/octet-stream')))aura_reply(502,['error'=>'Invalid audio response. Try again later.']);
    aura_reply(200,['audio'=>base64_encode($response),'mime'=>'audio/mpeg','voice'=>'marin']);
}
$data=json_decode($response,true);
if(!is_array($data))aura_reply(502,['error'=>'Invalid provider response.']);
try {$answer=aura_answer($data);}catch(RuntimeException $e){aura_reply(502,['error'=>$e->getMessage()]);}
aura_reply(200,['answer'=>$answer]);
