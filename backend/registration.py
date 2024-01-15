from postgres import *
import yaml
import os

projectdirectory = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
configdirectory = os.path.join(projectdirectory,"config")
yaml_file_path = os.path.join(configdirectory,"register_config.yaml")
# Load the YAML configuration file
with open(yaml_file_path, 'r') as yaml_file:
    config = yaml.safe_load(yaml_file)

# Extract user details from the configuration
user_details = config.get('user')

new_user = create_user(
    user_details['username'],
    user_details['password'],
    user_details['email'],
    'user',
    user_details['firstname'],
    user_details['lastname'],
    user_details['contact_number']
)

# Extract admin details from the configuration
admin_details = config.get('admin')

new_admin = create_user(
    admin_details['username'],
    admin_details['password'],
    admin_details['email'],
    'admin',
    admin_details['firstname'],
    admin_details['lastname'],
    admin_details['contact_number']
)

# Extract super admin details from the configuration
superadmin_details = config.get('superadmin')

new_superadmin = create_user(
    superadmin_details['username'],
    superadmin_details['password'],
    superadmin_details['email'],
    'superadmin',
    superadmin_details['firstname'],
    superadmin_details['lastname'],
    superadmin_details['contact_number']
)

#if new_user, new_admin and new_superadmin:
if new_user:
    print("User registered successfully")
if new_admin:
    print("Admin registered successfully")
if new_superadmin:
    print("Superadmin registered successfully")
else:
    print("Registration failed")
