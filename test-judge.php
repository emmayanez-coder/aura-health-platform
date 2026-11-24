<?php
declare(strict_types=1);
function wp_check_password(string $code,string $hash): bool {return password_verify($code,$hash);}
require __DIR__.'/dist/api/judge-access.php';
$code='test-only-code-not-for-deployment-839';
$settings=['enabled'=>true,'expires'=>2000,'hash'=>password_hash($code,PASSWORD_DEFAULT)];
function verify_test(bool $condition): void {if(!$condition)throw new RuntimeException('Judge auth test failed');}
verify_test(aura_judge_authorized($code,$settings,1000));
verify_test(!aura_judge_authorized('wrong-code-with-enough-length',$settings,1000));
verify_test(!aura_judge_authorized('',$settings,1000));
verify_test(!aura_judge_authorized($code,$settings,2000));
verify_test(!aura_judge_authorized($code,[...$settings,'enabled'=>false],1000));
verify_test(!aura_judge_authorized($code,[],1000));
echo "PASS: valid judge code, incorrect/missing code, expiry and disabled access.\n";
