<?php
declare(strict_types=1);
function aura_public_access_limit(): void {
    if(!function_exists('aura_companion_take_slot'))aura_reply(503,['error'=>'Public AI requires the AURA Companion Setup plugin to remain active.']);
    // Anonymous visitors are rate-limited; this grants no WordPress administrative access.
    global $wpdb;
    $client=substr(hash_hmac('sha256',$_SERVER['REMOTE_ADDR']??'unknown',wp_salt('auth')),0,24);
    try {
        aura_companion_take_slot('aura_public_min_'.gmdate('YmdHi').'_'.$client,20);
        aura_companion_take_slot('aura_public_day_'.gmdate('Ymd').'_'.$client,200);
        foreach(['min'=>gmdate('YmdHi',time()-86400),'day'=>gmdate('Ymd',time()-7*86400)] as $kind=>$cutoff){
            $prefix='aura_public_'.$kind.'_';
            $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s AND option_name<%s",$wpdb->esc_like($prefix).'%', $prefix.$cutoff));
        }
    } catch(OverflowException $e){aura_reply(429,['error'=>'Too many requests from this network. Please wait before retrying.']);}
    catch(Throwable $e){aura_reply(503,['error'=>'Public request counters unavailable. Please contact the site owner.']);}
}
