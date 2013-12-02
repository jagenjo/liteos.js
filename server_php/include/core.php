<?php

error_reporting(E_ALL);

//require config vars
require_once __DIR__ . "/config.php";

//session storage
$session_enabled = session_start();

// LOG *****************************
function trace($str)
{
	$f = fopen(__DIR__."/trace.log","a");
	fwrite($f, date("Y-m-d H:i:s") . ": " . $str."\n");
	fclose($f);
}

$debug_buffer = Array();
function debug($str)
{
	global $debug_buffer;
	$debug_buffer[] = $str;
}

function getDebugLog()
{
	global $debug_buffer;
	return $debug_buffer;
}

//Modular architecture **********************
$loaded_modules = array();

function registerModule($modulename, $class)
{
	global $loaded_modules;
	$loaded_modules[$modulename] = new $class();
}

function getModule($modulename)
{
	global $loaded_modules;

	if( strpos("..",$modulename) != FALSE || strpos("/",$modulename) != FALSE)
		return null; //Safety, avoid letting get out of the folder. TODO: IMPROVE THIS!! ITS NOT SAFE

	if( isset( $loaded_modules[$modulename] ) ) //reuse between modules
		return $loaded_modules[$modulename];

	if( file_exists(__DIR__ . "/modules/" . $modulename . ".php") == FALSE)
		return NULL;

	//TODO: dangerous, what if one module adds another one?
	require_once "modules/" . $modulename . ".php";

	return $loaded_modules[$modulename];
}

function loadModules($str)
{
	$result = Array();
	if($str == "*")
	{
		$files = scandir(__DIR__ . '/modules/');
		foreach($files as $file)
		{
			if ($file == '.' || $file == '..' || substr($file,-4) != ".php") continue;
			//require_once 'modules/'.$file;
			$module = getModule( substr($file,0,-4) );
			$result[] = $module;
		}
		return $result;
	}

	$tokens = explode(",",$str);
	foreach($tokens as $k=>$v)
		$result[] = getModule($v);
	return $result;
}

function dispatchEventToModules($event_type, $event)
{
	$modules = loadModules("*");
	foreach($modules as $module)
	{
		if( method_exists($module,$event_type) )
		{
			if ( call_user_func( array($module , $event_type), $event) == false )
				break;
		}
	}
}

/* Resources Handlers ******************************/
$mysqli = null;

function getSQLDB()
{
	global $mysqli;
	if( $mysqli ) return $mysqli;

	$mysqli = new mysqli("localhost",DB_USER,DB_PASSWORD);
	if (mysqli_connect_errno())
		die("SQL Error: " . mysqli_connect_error());

	if( $mysqli->select_db(DB_NAME) == FALSE)
		die(DB_NAME."' not found, be sure to create the DB");

	return $mysqli;
}

function closeSQLDB()
{
	global $mysqli;
	if( $mysqli ) $mysqli->close();
}

//***** REDIS ********************
$redis = null;
require_once 'extra/Predis/Autoloader.php';

function getRedisDB()
{
	global $redis;
	if ($redis) return $redis;

	Predis\Autoloader::register();
	$redis = new Predis\Client();
	return $redis;
}

?>