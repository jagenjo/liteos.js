<?php

require_once 'include/core.php';


if( !isset($_REQUEST["action"]) )
{
	//var_dump($_REQUEST);
	//var_dump($_POST);
	//var_dump($_SERVER);
	die('{"msg":"no action"}');
}

//retrieve module name and action
$action = $_REQUEST["action"];

$pos = strpos($action,":");
if ($pos == false)
	die('{"msg":"no module in action"}');

$module_name = substr($action,0,$pos);
$module_action = substr($action, $pos + 1, strlen($action) - $pos - 1);

//get module
$module = getModule($module_name);
if($module && method_exists($module,"processAction"))
	$module->processAction($module_action);
else
	die('{"msg":"module not found: '.$module.'"}');

closeSQLDB();
?>