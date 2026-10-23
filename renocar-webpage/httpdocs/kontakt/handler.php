<?php
// Never print errors: the response must be pure JSON (form.js parses it), and any
// notice/deprecation (e.g. old PHPMailer on PHP 8.5) would corrupt it. Errors go to the log.
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
/*
Tested working with PHP5.4 and above (including PHP 7 )

 */
require_once './vendor/autoload.php';

use FormGuide\Handlx\FormHandler;


$pp = new FormHandler(); 

$validator = $pp->getValidator();
$validator->fields(['name','phone'])->areRequired()->maxLength(50);
$validator->field('email')->isEmail();
$validator->field('message')->maxLength(6000);


$pp->sendEmailTo('info@renocar.pl'); // ← Your email here

echo $pp->process($_POST);