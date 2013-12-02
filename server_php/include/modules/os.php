<?php

class OSModule
{

	// List of internal configurable variables
	//********************************************
	//private static $PASS_SALT = ""; //for salting the passwords in the MD5

	//this is used to store the result of any call
	public $result = null;

	public $users_created_limit = 0;

	//called always
	function __construct() {
	}

	//called when an ajax action is requested to this module
	public function processAction($action)
	{
		$this->result = Array();
		$this->result["debug"] = Array();

		if ($action == "man")
			$this->actionMan();
		else
		{
			//nothing
			$this->result["status"] = 0;
			$this->result["msg"] = 'no action performed';
		}

		$this->result["debug"] = getDebugLog();

		//the response is encoded in JSON on AJAX calls
		print json_encode($this->result);
	}

	//Action methods *****************************************************
	//Check that everything is ok before doing anything, do and change the result

	public function actionMan()
	{
		if(!isset($_REQUEST["cmd"]))
		{
			$this->result["status"] = -1;
			$this->result["type"] = "text";
			$this->result["msg"] = 'man not available';
			return;
		}

		$cmd = addslashes($_REQUEST["cmd"]);
		$this->result["msg"] = "Man found";
		$this->result["status"] = 1;
		$this->result["user"] = $user;
	}
};

//make it public
registerModule("os", "OSModule" );
?>