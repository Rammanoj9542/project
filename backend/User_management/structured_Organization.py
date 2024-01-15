from fastapi import FastAPI, Request, Depends, HTTPException, Body
from sqlalchemy.orm import scoped_session, sessionmaker, Session, load_only, joinedload
import logging
from postgres import *


def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()


app = FastAPI()

SECRET_KEY = "your_secret_key"

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class Structured_Organization:
    def __init__(self, logger):
        self.logger = logger

    # update space and it's required functions
    def update_spacename(self, oldspacename, newspacename, db: Session):
        try:
            # Validate input data
            if not oldspacename or not newspacename:
                raise HTTPException(
                    status_code=400,
                    detail="Both oldSpaceName and newSpaceName are required.",
                )

            existing_space = (
                db.query(Spaces).filter(Spaces.space_name == oldspacename).first()
            )

            if existing_space:
                # Check if the new space name already exists
                conflicting_space = (
                    db.query(Spaces).filter(Spaces.space_name == newspacename).first()
                )

                if conflicting_space:
                    raise HTTPException(
                        status_code=409, detail=f"Space {newspacename} already exists."
                    )

                # Update the space name
                existing_space.space_name = newspacename

                # Commit the changes to the database
                db.commit()

                return existing_space.space_id, True  # Return both values in a tuple

            else:
                raise HTTPException(
                    status_code=404, detail=f"Space {oldspacename} does not exist."
                )

        except IntegrityError as e:
            db.rollback()
            raise HTTPException(status_code=500, detail="Internal server error") from e

    def update_space(self, data: dict, db: Session = Depends(get_db)):
        try:
            oldspacename = data.get("oldSpaceName")
            newspacename = data.get("newSpaceName")

            # Create a new space in the main database and get the space_id
            spacename, success = self.update_spacename(oldspacename, newspacename, db)

            if success:
                return {
                    "message": "Space name updated successfully",
                    "space_id": spacename,
                }
            else:
                return {"message": "Failed to update space name", "space_id": None}

        except HTTPException as e:
            raise e  # Re-raise HTTPException to let FastAPI handle it
        except Exception as e:
            raise HTTPException(status_code=500, detail="Internal server error") from e

    # adminusernameswithoutspace function
    def get_adminUsernamesWithoutSpace(self, data: dict = Body(...)):
        try:
            if data:
                raise HTTPException(
                    status_code=400, detail="JSON data is not allowed for this route"
                )
            else:
                # Query for users with the role "admin" specifically
                adminUsers = (
                    session.query(User)
                    .filter(
                        User.role == "admin",
                        or_(User.space_id == "", User.space_id.is_(None)),
                    )
                    .all()
                )

                if adminUsers is None:
                    # If no data is found in the database, raise a 404 Not Found error
                    raise HTTPException(status_code=404, detail="No admin users found")

                # Create a dictionary in the desired format using a dictionary comprehension
                admin_data = [
                    {"id": admin_user.user_id, "name": admin_user.username}
                    for admin_user in adminUsers
                ]

                logger.info(f"Admin User Names retrieved successfully")
                return {"adminData": admin_data}

        except Exception as e:
            logger.error(f"An error occurred: {str(e)}")  # Log an error message
            raise HTTPException(
                status_code=500, detail=f"Failed to fetch adminUsers: {str(e)}"
            )

    # get space_data function
    def get_spaceids(self, data: dict = Body(...)):
        try:
            if data:
                raise HTTPException(
                    status_code=400, detail="JSON data is not allowed for this route"
                )
            else:
                space_id = session.query(Spaces).filter_by().all()
                if not space_id:
                    # If no data is found in the database, raise a 404 Not Found error
                    raise HTTPException(status_code=404, detail="Data not found")

                # Create a dictionary in the desired format using a dictionary comprehension
                space_data = [
                    {"id": space.space_id, "name": space.space_name}
                    for space in space_id
                ]

                logger.info(f"Space Ids fetched successfully.")
                return {"spaces": space_data}

        except Exception as e:
            logger.error(f"An error occured: {str(e)}")  # Log an error message
            raise HTTPException(
                status_code=500, detail=f"Failed to fetch spaceids: {str(e)}"
            )

    # get_admin_spaceids function
    def get_admin_spaceids(self, data: dict, db: Session = Depends(get_db)):
        try:
            user_id = data.get("user_id")
            # Assuming you have a User model
            user = db.query(User).filter(User.user_id == user_id).first()

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            if user.role != "admin":
                raise HTTPException(status_code=403, detail="User is not an admin")

            # Fetch space_ids for the admin user
            space_ids = db.query(User.space_id).filter(User.user_id == user_id).all()

            if not space_ids:
                raise HTTPException(
                    status_code=404, detail="No space IDs found for the admin"
                )

            space_ids_list = [space_id[0] for space_id in space_ids]
            # Fetch additional space details if needed, based on the fetched space_ids

            return {"spaces": space_ids_list}

        except HTTPException as http_err:
            raise http_err

        except Exception as e:
            logger.error(f"An error occurred: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Failed to fetch space IDs: {str(e)}"
            )

    # get hierarchy data functions
    def admin_view(self,data: dict, db: Session = Depends(get_db)):
        admin_id = data.get("admin_id")
        try:
            # Check if JSON content is present in the request
            if not data:
                raise HTTPException(
                    status_code=400, detail="JSON data is required for this route"
                )

            # Query to fetch hierarchy_id, hierarchy_name, and space_id for a given admin_id
            admin_hierarchies = (
                db.query(
                    Hierarchy.hierarchy_id, Hierarchy.hierarchy_name, Hierarchy.space_id
                )
                .filter(Hierarchy.admin_id == admin_id)
                .all()
            )
            print(admin_hierarchies)
            if len(admin_hierarchies) == 0:
                raise HTTPException(
                    status_code=404, detail="No hierarchies found for the admin"
                )

            # Format the retrieved data into a list of dictionaries
            result = [
                {
                    "hierarchy_id": hierarchy.hierarchy_id,
                    "hierarchy_name": hierarchy.hierarchy_name,
                    "space_id": hierarchy.space_id,
                }
                for hierarchy in admin_hierarchies
            ]

            return {"admin_hierarchies": result}

        except HTTPException as http_exception:
            # Catch specific HTTPException with 404 status code
            if http_exception.status_code == 404:
                logger.warning("No hierarchies found for the admin")
            raise http_exception  # Re-raise the HTTPException with the original status code
        except Exception as e:
            logger.error(f"An error occurred: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Failed to fetch admin hierarchies: {str(e)}"
            )

    # get_hierarchy data of spaces
    def get_hierarchies_by_space_id(self,data: dict, db: Session = Depends(get_db)):
     try:
        space_id = data.get("spaceId")
        existing_space = db.query(Spaces).filter_by(space_id=space_id).first()

        if not existing_space:
            raise HTTPException(status_code=404, detail="Space not found")

        hierarchies = db.query(Hierarchy).filter_by(space_id=space_id).all()

        if not hierarchies:
            raise HTTPException(
                status_code=404, detail="No hierarchies found for this space_id"
            )

        # Extracting hierarchy names and ids
        hierarchy_info = [
            {"id": hierarchy.hierarchy_id, "name": hierarchy.hierarchy_name}
            for hierarchy in hierarchies
        ]

        return hierarchy_info

     except HTTPException as e:
        raise e

    # get users of particular space function
    def get_Usernames(self, data: dict):
        try:
            space_id = data.get("spaceId")

            if space_id is None:
                raise HTTPException(status_code=400, detail="Space ID is required")

            users = (
                session.query(User)
                .filter(User.role.contains("user"), User.space_id == space_id)
                .all()
            )

            if not users:
                raise HTTPException(
                    status_code=404, detail="No users found for the given space ID"
                )

            users_data = [
                {"user_id": user.user_id, "username": user.username} for user in users
            ]

            logger.info(f"Users data retrieved successfully")
            return {"Users": users_data}

        except HTTPException as http_err:
            raise http_err

        except Exception as e:
            logger.error(f"An error occurred: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Failed to fetch users: {str(e)}"
            )

    #  hierarchy updation function
    def update_hierarchyname(self, oldhierarchyname, newhierarchyname, db: Session):
        try:
            # Validate input data
            if not oldhierarchyname or not newhierarchyname:
                raise HTTPException(
                    status_code=400,
                    detail="Both oldhierarchyname and newhierarchyname are required.",
                )

            existing_hierarchy = (
                db.query(Hierarchy)
                .filter(Hierarchy.hierarchy_name == oldhierarchyname)
                .first()
            )

            if existing_hierarchy:
                # Check if the new hierarchy name already exists
                conflicting_hierarchy = (
                    db.query(Hierarchy)
                    .filter(Hierarchy.hierarchy_name == newhierarchyname)
                    .first()
                )

                if conflicting_hierarchy:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Hierarchy {newhierarchyname} already exists.",
                    )

                existing_hierarchy.hierarchy_name = newhierarchyname

                # Commit the changes to the database
                db.commit()

                print(f"Hierarchy updated  successfully.")
                return True  # Return both values in a tuple

            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"Hierarchy {oldhierarchyname} does not exist.",
                )

        except IntegrityError as e:
            db.rollback()
            raise HTTPException(status_code=500, detail="Internal server error") from e

    def update_hierarchy(self, data: dict, db: Session = Depends(get_db)):
        try:
            oldhierarchyname = data["oldHierarchyName"]
            newhierarchyname = data["newHierarchyName"]

            # Create a new space in the main database and get the space_id
            self.update_hierarchyname(oldhierarchyname, newhierarchyname, db)

            return {"message": "Hierarchy name updated successfully"}

        except IntegrityError as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"internal server error") from e

    # get user hierarchy names function
    def get_user_hierarchy_names(self, data: dict, db: Session = Depends(get_db)):
        user_id = data.get("user_id")

        # Fetch the hierarchy IDs by user_id
        user = (
            db.query(User).filter(User.user_id == user_id, User.role == "user").first()
        )

        if user:
            user_hierarchy_ids = user.hierarchy_ids

            hierarchies = []
            for hierarchy_id in user_hierarchy_ids:
                hierarchy = (
                    db.query(Hierarchy)
                    .filter(Hierarchy.hierarchy_id == hierarchy_id)
                    .first()
                )
                if hierarchy:
                    hierarchies.append(
                        {
                            "hierarchy_id": hierarchy.hierarchy_id,
                            "hierarchy_name": hierarchy.hierarchy_name,
                        }
                    )

            return {"user_hierarchy_ids": hierarchies}

        raise HTTPException(status_code=404, detail="User not found")

    #  get user details function

    def get_user_details(self, data: dict, db: Session = Depends(get_db)):
        try:
            username = data.get("username")
            user = session.query(User).filter_by(username=username).first()
            user_details = {
                "firstname": user.firstname,
                "lastname": user.lastname,
                "username": username,
                "email": user.email,
                "contact_number": user.contact_number,
                "role": user.role,
            }
            return user_details
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to fetch data: {str(e)}"
            )

    # active users function
    def active_users(self, data: dict, db: Session = Depends(get_db)):
        space_id = data.get("space_id")
        try:
            # Check if JSON content is present in the request
            if not data:
                raise HTTPException(
                    status_code=400, detail="JSON data is not allowed for this route"
                )

            active_users_data = []
            active_users = (
                db.query(UserAttributes)
                .filter_by(active_status="active")
                .join(User, User.user_id == UserAttributes.user_id)
                .filter(
                    User.space_id == space_id,
                    User.role == "user",
                )
                .all()
            )
            for user in active_users:
                active_users_data.append({"username": user.user.username})

            logger.info("Active users list fetched successfully")
            return {"active_users": active_users_data}

        except Exception as e:
            logger.error(f"An error occurred: {str(e)}")
            raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

    #
    def get_users_by_hierarchies(self, data: dict, db: Session = Depends(get_db)):
        hierarchy_id = data.get("hierarchy_id")

        # Fetch users with the specified hierarchy ID and role
        users = (
            db.query(User)
            .filter(User.role == "user", text(":hierarchy_id = ANY(hierarchy_ids)"))
            .params(hierarchy_id=hierarchy_id)  # Use params to bind the value safely
            .all()
        )
        if users:
            user_data = []

            for user in users:
                user_info = {
                    user.username,
                }
                user_data.append(user_info)

            return {"users": user_data}

        raise HTTPException(status_code=404, detail="No users found")

    #
    def get_adminUsernames(self, data: dict = Body(...)):
        try:
            if data:
                raise HTTPException(
                    status_code=400, detail="JSON data is not allowed for this route"
                )
            else:
                # Query for users with the role "admin" specifically
                adminUsers = session.query(User).filter(User.role == "admin").all()

                if not adminUsers:
                    # If no data is found in the database, raise a 404 Not Found error
                    raise HTTPException(status_code=404, detail="Data not found")

                # Create a dictionary in the desired format using a dictionary comprehension
                admin_data = [
                    {"id": admin_user.user_id, "name": admin_user.username}
                    for admin_user in adminUsers
                ]

                logger.info(f"Admin User Names {admin_data}")
                return {"adminData": admin_data}

        except Exception as e:
            logger.error(f"An error occurred: {str(e)}")  # Log an error message
            raise HTTPException(
                status_code=500, detail=f"Failed to fetch adminUsers : {str(e)}"
            )
