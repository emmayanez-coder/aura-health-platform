<?php
declare(strict_types=1);
// The judge code is a separate credential, never an OpenAI key or WP password.
function aura_judge_authorized(string $code, array $settings, int $now): bool {
    if(($settings['enabled']??false)!==true || !is_int($settings['expires']??null) || $settings['expires']<=$now)return false;
    if(strlen($code)<20||strlen($code)>128||!is_string($settings['hash']??null))return false;
    return wp_check_password($code,$settings['hash']);
}
function aura_judge_check(): bool {
    $settings=get_option('aura_judge_access_v1',[]);
    if(!is_array($settings)||!function_exists('aura_companion_take_slot'))return false;
    // Rate-limit code verification before the expensive password hash check.
    global $wpdb;
    $client=substr(hash_hmac('sha256',$_SERVER['REMOTE_ADDR']??'unknown',wp_salt('auth')),0,24);
    try {
        aura_companion_take_slot('aura_judge_min_'.gmdate('YmdHi').'_'.$client,20);
        aura_companion_take_slot('aura_judge_day_'.gmdate('Ymd').'_'.$client,200);
        foreach(['min'=>gmdate('YmdHi',time()-86400),'day'=>gmdate('Ymd',time()-7*86400)] as $kind=>$cutoff){
            $prefix='aura_judge_'.$kind.'_';
            $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s AND option_name<%s",$wpdb->esc_like($prefix).'%', $prefix.$cutoff));
        }
    } catch(OverflowException $e){aura_reply(429,['error'=>'Too many access attempts. Wait before retrying.']);}
    catch(Throwable $e){aura_reply(503,['error'=>'Access counters unavailable. Please contact the site owner.']);}
    return aura_judge_authorized($_SERVER['HTTP_X_AURA_ACCESS_CODE']??'', $settings,time());
}
