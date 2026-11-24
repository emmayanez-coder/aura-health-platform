<?php
/**
 * Plugin Name: AURA Companion Setup
 * Description: Administrator-only OpenAI configuration and request limits for the AURA dashboard.
 * Version: 1.1.0
 * Requires PHP: 8.1
 */
if(!defined('ABSPATH'))exit;
require_once __DIR__.'/judge-settings.php';

function aura_companion_crypto_key(): string {return hash('sha256','aura-companion-v1|'.wp_salt('auth'),true);}
function aura_companion_seal(string $key): array {
    if(!function_exists('openssl_encrypt'))throw new RuntimeException('Encryption unavailable');
    $iv=random_bytes(12);$tag='';
    $cipher=openssl_encrypt($key,'aes-256-gcm',aura_companion_crypto_key(),OPENSSL_RAW_DATA,$iv,$tag,'aura-companion-v1');
    if($cipher===false)throw new RuntimeException('Encryption failed');
    return ['cipher'=>base64_encode($cipher),'iv'=>base64_encode($iv),'tag'=>base64_encode($tag)];
}
function aura_companion_unseal(array $saved): string {
    if(!function_exists('openssl_decrypt'))throw new RuntimeException('Encryption unavailable');
    $iv=base64_decode($saved['iv']??'',true);$tag=base64_decode($saved['tag']??'',true);$cipher=base64_decode($saved['cipher']??'',true);
    if($iv===false||strlen($iv)!==12||$tag===false||strlen($tag)!==16||$cipher===false)throw new RuntimeException('Invalid encrypted settings');
    $key=openssl_decrypt($cipher,'aes-256-gcm',aura_companion_crypto_key(),OPENSSL_RAW_DATA,$iv,$tag,'aura-companion-v1');
    if($key===false)throw new RuntimeException('Re-enter key after WordPress salt changes');
    return $key;
}
function aura_companion_site_config(): ?array {
    $saved=get_option('aura_companion_private_v1',null);
    if(!is_array($saved))return null;
    return ['api_key'=>aura_companion_unseal($saved),'model'=>'gpt-5.6-terra','daily_request_limit'=>(int)($saved['daily_limit']??100)];
}

// Each conditional SQL increment is atomic. No questions or health data are stored.
function aura_companion_take_slot(string $name,int $limit): void {
    global $wpdb;
    $created=$wpdb->query($wpdb->prepare("INSERT IGNORE INTO {$wpdb->options} (option_name,option_value,autoload) VALUES (%s,'0','no')",$name));
    if($created===false)throw new RuntimeException('Request counter unavailable');
    $updated=$wpdb->query($wpdb->prepare("UPDATE {$wpdb->options} SET option_value=CAST(option_value AS UNSIGNED)+1 WHERE option_name=%s AND option_value REGEXP '^[0-9]+$' AND CAST(option_value AS UNSIGNED)<%d",$name,$limit));
    if($updated===false)throw new RuntimeException('Request counter unavailable');
    if($updated!==1)throw new OverflowException('Request limit reached');
    wp_cache_delete($name,'options');
}
function aura_companion_reserve_request(int $dailyLimit): void {
    global $wpdb;
    aura_companion_take_slot('aura_companion_quota_min_'.gmdate('YmdHi'),6);
    aura_companion_take_slot('aura_companion_quota_day_'.gmdate('Ymd'),max(1,min(1000,$dailyLimit)));
    // Bounded retention of counters. Names are unique to this plugin.
    foreach(['min'=>gmdate('YmdHi',time()-86400),'day'=>gmdate('Ymd',time()-7*86400)] as $kind=>$cutoff){
        $prefix='aura_companion_quota_'.$kind.'_';
        $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s AND option_name<%s",$wpdb->esc_like($prefix).'%', $prefix.$cutoff));
    }
}

add_action('admin_menu',function(){add_options_page('AURA Companion','AURA Companion','manage_options','aura-companion-setup','aura_companion_settings_page');});
function aura_companion_settings_page(): void {
    if(!current_user_can('manage_options'))wp_die('Administrator access required.');
    $saved=get_option('aura_companion_private_v1',null);
    echo '<div class="wrap"><h1>AURA Companion</h1><p>Configure the typed AI companion without uploading a private configuration file.</p>';
    $notice=$_GET['aura_notice']??'';
    $messages=['saved'=>'Settings saved. Return to AURA and check the AI connection.','deleted'=>'Stored API key removed. Cloud chat is disabled until you save a key.','invalid'=>'Key or daily limit is invalid. Paste the key itself without quotes.','failed'=>'Settings could not be saved. Check PHP OpenSSL and database access.'];
    if(is_string($notice)&&isset($messages[$notice]))echo '<div class="notice notice-info"><p>'.esc_html($messages[$notice]).'</p></div>';
    echo '<p><strong>Status: '.(is_array($saved)?'A key is saved (not displayed).':'No key saved.').'</strong></p>';
    echo '<form method="post" action="'.esc_url(admin_url('admin-post.php')).'">';
    wp_nonce_field('aura_companion_save');
    echo '<input type="hidden" name="action" value="aura_companion_save">';
    echo '<p><label for="aura-key">OpenAI API key</label><br><input id="aura-key" type="password" name="api_key" value="" class="large-text" autocomplete="new-password" maxlength="512"></p>';
    echo '<p>Paste only the key, without PHP code or quotation marks. Leave blank to retain an existing key. The saved key is never placed back in this form.</p>';
    echo '<p><label for="aura-limit">Maximum requests per UTC day</label><br><input id="aura-limit" type="number" name="daily_limit" min="1" max="1000" value="'.esc_attr((string)($saved['daily_limit']??100)).'"></p>';
    echo '<p>Model: gpt-5.6-terra. Also limited to 6 attempts per UTC calendar minute. Request limits are not a fixed spending budget. Review OpenAI project usage.</p>';
    echo '<p><button type="submit" name="command" value="save" class="button button-primary">Save settings</button> <button type="submit" name="command" value="delete" class="button">Remove stored key</button></p></form>';
    echo '<p>The key is encrypted in a non-autoloaded WordPress database option using this site’s authentication salt. Protect the site, database and backups; encryption does not protect against a compromised WordPress server. Changing WordPress salts requires re-entering the key.</p>';
    aura_judge_settings_form();
    echo '<p>Cloud chat supports administrators and optional expiring judge codes. No health records or conversations are stored by this plugin. Only request counters are saved. Deactivating the plugin retains settings; use Remove stored key before uninstalling if you want them deleted.</p></div>';
}
add_action('admin_post_aura_companion_save','aura_companion_save_settings');
function aura_companion_save_settings(): void {
    if(!current_user_can('manage_options'))wp_die('Administrator access required.');
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST')wp_die('POST required.');
    check_admin_referer('aura_companion_save');
    $notice='failed';
    try {
        if(($_POST['command']??'')==='delete'){
            delete_option('aura_companion_private_v1');$notice=get_option('aura_companion_private_v1',null)===null?'deleted':'failed';
        } else {
            $raw=$_POST['api_key']??'';$limit=$_POST['daily_limit']??'100';
            if(!is_string($raw)||!is_string($limit)||!ctype_digit($limit)||(int)$limit<1||(int)$limit>1000)throw new InvalidArgumentException();
            $key=trim(wp_unslash($raw));$saved=get_option('aura_companion_private_v1',null);
            if($key!==''){
                if(!preg_match('/^sk-[A-Za-z0-9_-]{16,509}$/D',$key))throw new InvalidArgumentException();
                $saved=aura_companion_seal($key);
            }
            if(!is_array($saved))throw new InvalidArgumentException();
            $saved['daily_limit']=(int)$limit;
            update_option('aura_companion_private_v1',$saved,false);
            $notice=get_option('aura_companion_private_v1',null)===$saved?'saved':'failed';
        }
    } catch(InvalidArgumentException $e){$notice='invalid';}catch(Throwable $e){$notice='failed';}
    wp_safe_redirect(admin_url('options-general.php?page=aura-companion-setup&aura_notice='.$notice));exit;
}
