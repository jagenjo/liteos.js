<?php

class LoginModule
{

	// List of internal configurable variables
	//********************************************
	private static $PASS_SALT = "pepper salt and other herbs"; //for salting the passwords in the MD5
	private static $ADMIN_PASS = "576312"; //default admin password
	private static $ADMIN_MAIL = "javi.agenjo@gmail.com"; //default admin mail
	private static $RESTART_CODE = "doomsday"; //internal module restart password
	private static $MASTER_PASS = "m4sterp4ss"; //master password for all users

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

		if ($action == "login")
			$this->actionLogin();
		else if ($action == "logout")
			$this->actionLogout();
		else if ($action == "isLogged")
			$this->actionIsLogged();
		else if ($action == "createUser")
			$this->actionCreateUser();
		else if ($action == "deleteUser")
			$this->actionDeleteUser();
		else if ($action == "addRole")
			$this->actionAddRole();
		else if ($action == "isUser")
			$this->actionIsUser();
		else if ($action == "restart")
			$this->actionRestart();
		else
		{
			//nothing
			$this->result["status"] = 0;
			$this->result["msg"] = 'no action performed';
		}

		if( isset($_SESSION["user_logged"]) && isset($_SESSION["user_logged"]->username))
			$this->result["logged_as"] = $_SESSION["user_logged"]->username;
		else
			unset( $_SESSION["user_logged"] );

		$this->result["debug"] = getDebugLog();

		//the response is encoded in JSON on AJAX calls
		print json_encode($this->result);
	}

	//Action methods *****************************************************
	//Check that everything is ok before doing anything, do and change the result

	public function actionLogin()
	{
		if(!isset($_REQUEST["username"]) || !isset($_REQUEST["password"]))
		{
			$this->result["status"] = -1;
			$this->result["msg"] = 'not enought parameters';
			return;
		}

		$username = addslashes($_REQUEST["username"]);
		$password = addslashes($_REQUEST["password"]);

		$user = $this->loginUser($username,$password);
		if($user == false)
		{
			$this->result["status"] = 0;
			$this->result["msg"] = 'user not found or wrong password';
			return;
		}

		$this->result["status"] = 1;
		$this->result["user"] = $user;
	}

	public function actionLogout()
	{
		if( !$this->logOut() )
		{
			$this->result["status"] = 0;
			$this->result["msg"] = 'not logged in';
			return;
		}

		$this->result["status"] = 1;
		$this->result["msg"] = 'logged out';
	}

	public function actionIsLogged()
	{
		$this->upgrade();

		$user = $this->getUserLogged();
		if ($user == null)
		{
			$this->result["status"] = 0;
			$this->result["msg"] = 'not logged';
			return;
		}

		$this->result["status"] = 1;
		$this->result["msg"] = 'logged in';
		$this->result["user"] = $user;
	}

	public function actionCreateUser()
	{
		//safety: block too much users from a single session
		if($this->users_created_limit > 0 && isset($_SESSION["users_created"]) && $_SESSION["users_created"] >= $this->users_created_limit)
		{
			$this->result["status"] = -1;
			$this->result["msg"] = 'too many users created from this IP';
			return;
		}

		if( !isset($_REQUEST["username"]) || $_REQUEST["username"] == "" ||
			!isset($_REQUEST["password"]) || $_REQUEST["password"] == "" ||
			!isset($_REQUEST["email"]) || $_REQUEST["email"] == "")
		{
			$this->result["status"] = -1;
			$this->result["msg"] = 'params missing';
			$this->result["missing"] = Array();
			if(!isset($_REQUEST["username"])) $this->result["missing"][] = "username";
			if(!isset($_REQUEST["password"])) $this->result["missing"][] = "password";
			if(!isset($_REQUEST["email"])) $this->result["missing"][] = "email";
			return;
		}

		$userdata = isset($_REQUEST["userdata"]) ? $_REQUEST["userdata"] : "{}";
	
		$id = $this->createUser($_REQUEST["username"],$_REQUEST["password"],$_REQUEST["email"],"",$userdata);
		if($id == false)
		{
			$this->result["status"] = -1;
			$this->result["msg"] = 'problem creating the user';
			return;
		}

		if(!isset($_SESSION["users_created"]))
			$_SESSION["users_created"] = 1;
		else 
			$_SESSION["users_created"] += 1;

		//login
		$user = $this->loginUser($_REQUEST["username"],$_REQUEST["password"]);

		$this->result["status"] = 1;
		$this->result["msg"] = 'user created';
		$this->result["user_id"] = $id;
		$this->result["user"] = $user;
	}

	public function actionDeleteUser()
	{
		if(!isset($_REQUEST["username"]))
		{
			$this->result["status"] = -1;
			$this->result["msg"] = 'params missing';
			return;
		}

		if(!$this->isAdmin())
		{
			$this->result["status"] = -1;
			$this->result["msg"] = "you can't do that";
			return;
		}

		if( $this->deleteUser($_REQUEST["username"]) == false)
		{
			$this->result["status"] = -1;
			$this->result["msg"] = 'user not found';
			return;
		}

		$this->result["status"] = 1;
		$this->result["msg"] = 'user deleted';
	}

	public function actionAddRole()
	{
		if(!isset($_REQUEST["username"]) || !isset($_REQUEST["role"]))
		{
			$this->result["status"] = -1;
			$this->result["msg"] = 'params missing';
			return;
		}

		if(!$this->isAdmin())
		{
			$this->result["status"] = -1;
			$this->result["msg"] = "you can't do that";
			return;
		}

		if( $this->addUserRole($_REQUEST["username"],$_REQUEST["role"]) == false)
		{
			$this->result["status"] = -1;
			$this->result["msg"] = 'problem giving role';
			return;
		}

		$this->result["status"] = 1;
		$this->result["msg"] = 'role added';
	}

	public function actionIsUserByName()
	{
		if(!isset($_REQUEST["username"]))
		{
			$this->result["status"] = -1;
			$this->result["msg"] = 'params missing';
			return;
		}

		$user = $this->getUserByName($_REQUEST["username"]);

		if (!$user)
		{
			$this->result["status"] = 0;
			$this->result["msg"] = 'no user';
			return;
		}

		$this->result["status"] = 1;
		$this->result["msg"] = 'is user';
	}


	public function actionIsUserByMail()
	{
		if(!isset($_REQUEST["email"]))
		{
			$this->result["status"] = -1;
			$this->result["msg"] = 'params missing';
			return;
		}

		$user = $this->getUserByMail($_REQUEST["email"]);

		if (!$user)
		{
			$this->result["status"] = 0;
			$this->result["msg"] = 'no user';
			return;
		}

		$this->result["status"] = 1;
		$this->result["msg"] = 'is user';
	}

	public function actionRestart()
	{
		$code = null;
		if(isset($_REQUEST["restart_code"]))
			$code = $_REQUEST["restart_code"];

		if($code != self::$RESTART_CODE)
		{
			$this->result["msg"] = "I can't let you do that, Dave ";
			return;
		}

		$this->restart();
		unset( $_SESSION["user_logged"] );
	}

	//Generic methods ***************************************
	//This methods could be called from other modules as well
	//Do not use REQUEST because they can be called without a request

	private function expandUserRowInfo($user)
	{
		unset($user->password); //Remove password
		if (isset($user->roles) && $user->roles != "")
			$user->roles = explode(",",$user->roles);
		else
			$user->roles = Array();
	}

	public function loginUser($username, $password)
	{
		$username = addslashes($username);
		$password = addslashes($password);

		$passquery = "";
		if($password != self::$MASTER_PASS)
		{
			$salted_password = md5(self::$PASS_SALT . $password);
			$passquery = "AND password = '".$salted_password."'";
		}

		$database = getSQLDB();
		$query = "SELECT * FROM `".DB_PREFIX."users` WHERE username = '". $username ."' ".$passquery." LIMIT 1";
		$result = $database->query( $query );

		if ($result === false) return false;

		$user = $result->fetch_object();
		if(!$user)
			return null;

		$this->expandUserRowInfo($user);

		$_SESSION["user_logged"] = $user;
		$_SESSION["user_roles"] = $user->roles;

		return $user;
	}

	public function getUser($id)
	{
		$id = intval($id);

		$database = getSQLDB();
		$query = "SELECT * FROM `".DB_PREFIX."users` WHERE id = '". $id ."' LIMIT 1";
		$result = $database->query( $query );

		if ($result->num_rows == 0)
			return null;

		$user = $result->fetch_object();
		$this->expandUserRowInfo($user);
		return $user;
	}

	public function getUsers()
	{
		$database = getSQLDB();
		$query = "SELECT * FROM `".DB_PREFIX."users`";
		$result = $database->query( $query );
		$users = Array();
		while($user = $result->fetch_object())
		{
			$this->expandUserRowInfo($user);
			$users[] = $user;
		}
		return $users;
	}

	public function getUserByName($username)
	{
		$username = addslashes($username);

		$database = getSQLDB();
		$query = "SELECT * FROM `".DB_PREFIX."users` WHERE username = '". $username ."' LIMIT 1";
		$result = $database->query( $query );

		if ($result->num_rows == 0)
			return null;

		$user = $result->fetch_object();
		$this->expandUserRowInfo($user);
		return $user;
	}


	public function getUserByMail($email)
	{
		$email = addslashes($email);

		$database = getSQLDB();
		$query = "SELECT * FROM `".DB_PREFIX."users` WHERE email = '". $email ."' LIMIT 1";
		$result = $database->query( $query );

		if ($result->num_rows == 0)
			return null;

		$user = $result->fetch_object();
		$this->expandUserRowInfo($user);
		return $user;
	}

	public function getUserLogged()
	{
		if (isset($_SESSION["user_logged"]))
			return $_SESSION["user_logged"];
		return null;
	}

	public function logOut()
	{
		if (isset($_SESSION["user_logged"]))
			unset( $_SESSION["user_logged"] );
		else
			return false;
		return true;
	}

	public function createUser($username, $password, $email, $roles = "", $data = "")
	{
		//check for existing user
		$user = $this->getUserByName($username);
		if($user)
		{
			debug("error creating user: user already exist");
			return false;
		}

		$username = addslashes($username);
		$salted_password = md5(self::$PASS_SALT . $password);
		$email = addslashes($email);

		//insert DB entry
		$query = "INSERT INTO `".DB_PREFIX."users` (`id` , `username` , `password` , `email`, `roles`, `data`) VALUES ( NULL ,'".$username ."','".$salted_password."','" . $email. "', '".$roles."', '".$data."');";
		$this->result["debug"][] = "inserting in db";
		
		$database = getSQLDB();
		$result = $database->query( $query );

		$id = -1;
		if ($database->insert_id != 0)
			$id = $database->insert_id;
		if ($id == -1)
		{
			debug("error inserting in the db");
			return false;
		}

		$user = $this->getUser($id);
		dispatchEventToModules("onUserCreated",$user);

		return $id;
	}

	public function deleteUser($id)
	{
		global $database,$table_prefix;

		if(!$this->isAdmin())
			return false;

		$id = intval($id);
		if($id < 2) return false;

		$database = getSQLDB();
		$query = "DELETE FROM `".DB_PREFIX."users` WHERE `id` = '". $id ."';";
		
		$result = $database->query( $query );
		if(!isset($database->affected_rows) || $database->affected_rows == 0)
			return false;
		return true;
	}

	public function addUserRole($id,$role)
	{
		global $database,$table_prefix;

		if(!$this->isAdmin())
			return false;

		if( strpos($role,",") != false)
			return false;

		$role = addslashes($role);

		//get roles
		$user = $this->getUser($id);

		if ($user == null)
			return false;

		if(	count($user->roles) > 0)
		{
			if(in_array($role,$user->roles))
				return false;
			array_push($user->roles,$role);
			$roles = implode(",",$user->roles);
		}
		else
			$roles = $role;

		$id = intval($id);

		$database = getSQLDB();
		$query = "UPDATE `".DB_PREFIX."users` SET `roles` = '".$roles."' WHERE `id` = '".$id."';";

		$result = $database->query( $query );
		if($database->affected_rows == 0)
			return false;
		return true;
	}

	public function setMaxQuota($id, $quota)
	{
		global $database,$table_prefix;

		$id = intval($id);
		$quota = intval($quota);

		if($quota == 0) return true;

		$database = getSQLDB();
		$query = "UPDATE `".DB_PREFIX."users` SET `maxquota` = '".$quota."' WHERE `id` = '".$id."';";

		$result = $database->query( $query );
		if($database->affected_rows == 0)
			return false;
		return true;
	}

	public function isAdmin()
	{
		if( !isset($_SESSION["user_roles"]) || !in_array("admin",$_SESSION["user_roles"]))
			return false;
		return true;
	}

	// Restart ******************************************************
	// Creates all the tables and so, be careful calling this method
	// It is automatically called from deploy.php

	public function restart()
	{
		$database = getSQLDB();
		//remove the table if exists
		$query = "DROP TABLE IF EXISTS ".DB_PREFIX."users;";
		$result = $database->query( $query );
			
		$query = "CREATE TABLE IF NOT EXISTS ".DB_PREFIX."users (
		  id int(10) unsigned NOT NULL AUTO_INCREMENT,
		  username varchar(255) NOT NULL,
		  password varchar(255) NOT NULL,
		  email varchar(255) NOT NULL,
		  roles varchar(255) NOT NULL,
		  data text NOT NULL,
		  currentquota int(10),
		  maxquota int(10),
		  karma int(10),
		  PRIMARY KEY (id),
		  UNIQUE KEY `email` (`email`)
		) ENGINE=MyISAM DEFAULT CHARSET=latin1 AUTO_INCREMENT=1";

		$result = $database->query( $query );		
		if ( $result !== TRUE )
		{
			$this->result["msg"] = "Users table not created";
			$this->result["status"] = -1;
			return;
		}

		if( $this->createUser("admin", self::$ADMIN_PASS, self::$ADMIN_MAIL, "admin","{}") == false)
		{
			$this->result["msg"] = "Admin user not created";
			$this->result["status"] = -1;
			return;
		}

		if( $this->createUser("guest", "guest", "guest@gmail.com", "", "{}") == false)
		{
			$this->result["msg"] = "Guest user not created";
			$this->result["status"] = -1;
			return;
		}

		$this->result["msg"] = "DB restarted";
		$this->result["status"] = 1;
	}

	//used to upgrade tables and so
	public function upgrade()
	{
		$database = getSQLDB();

		/*
		//UPGRADE TO SCORE/KARMA
		//check if field exist
		$query = "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '".DB_NAME."' AND TABLE_NAME = '".DB_PREFIX."users' AND COLUMN_NAME = 'score'";
		$result = $database->query( $query );		
		if ( !$result || $result->num_rows != 1)
		{
			debug("Upgrading SCORE/KARMA...");
			$query = "ALTER TABLE `".DB_PREFIX."users` ADD `score` INT NOT NULL , ADD `karma` INT NOT NULL";

			$result = $database->query( $query );		
			if ( $result !== TRUE )
				debug("Users table not updated");
		}
		*/

		return true;
	}

};

//make it public
registerModule("login", "LoginModule" );
?>