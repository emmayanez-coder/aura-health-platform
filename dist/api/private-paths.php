<?php
declare(strict_types=1);
function aura_find_private(array $candidates,array $publicRoots): array {
    $checks=[];$selected=null;
    foreach(array_unique($candidates) as $candidate) {
        $resolved=@realpath($candidate);
        $config=@realpath($candidate.'/config.php');
        $public=false;
        foreach($publicRoots as $root) {
            $root=@realpath($root);if($root===false)continue;
            foreach([$resolved,$config] as $target) {
                if($target!==false&&($target===$root||str_starts_with($target,$root.DIRECTORY_SEPARATOR)))$public=true;
            }
        }
        $exists=$config!==false&&@is_file($config);
        $checks[]=['directory'=>$candidate,'directory_found'=>$resolved!==false,'config_found'=>$exists,'blocked_public_location'=>$public];
        if($selected===null&&$resolved!==false&&$exists&&!$public)$selected=['directory'=>$resolved,'config'=>$config];
    }
    return ['selected'=>$selected,'checks'=>$checks];
}
