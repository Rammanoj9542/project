from fastapi import FastAPI, Request, Depends, HTTPException, Body
from sqlalchemy.orm import scoped_session, sessionmaker, Session, load_only, joinedload
import logging
from typing import List
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

class Authorization:
    def __init__(self, logger):
        self.logger = logger

# active admins function
        
    def active_admins(self,data: dict = Body(...), db: Session = Depends(get_db)):
     try:
        # Check if JSON content is present in the request
        if data:
            raise HTTPException(
                status_code=400, detail="JSON data is not allowed for this route"
            )
        active_admin_names = []
        active_admins = (
            db.query(UserAttributes)
            .filter_by(active_status="active")
            .join(User, User.user_id == UserAttributes.user_id)
            .filter(User.role == "admin")
            .all()
        )
        for active_admin in active_admins:
            active_admin_names.append(active_admin.user.username)
        logger.info("Active admins list fetched successfully")
        return {"active_admins": active_admin_names}
     except Exception as e:
        logger.error(f"an error occured{str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
     
# assign space function
    def assign_space_to_admin(self,
    user_ids: List[str] = Body(...),
    space_id: str = Body(...),
    session: Session = Depends(get_db),
 ):
     try:
        space_exists = session.query(
            exists().where(Spaces.space_id == space_id)
        ).scalar()
        if not space_exists:
            raise HTTPException(
                status_code=404, detail=f"The space with ID {space_id} does not exist"
            )

        for user_id in user_ids:
            user = session.query(User).filter(User.user_id == user_id).first()
            if user is None:
                print(f"User with ID {user_id} is not an admin")
                continue

            sql = text(
                "UPDATE users " "SET space_id = :space_id " "WHERE user_id = :user_id"
            )

            session.execute(sql, {"space_id": space_id, "user_id": user_id})
            session.commit()

            print(
                f"Space ID {space_id} assigned to admin {user_id}"
            )

        return {"message": "Space assigned to the admins successfully"}
     except HTTPException as e:
        # Re-raise the HTTPException to maintain the appropriate status code and detail
        raise
     except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")  
 
#  assign hierarchy function
    def update_hierarchies(self,user_id, admin_id, hierarchy_ids, db: Session):
    # Check if the user exists
     user = db.query(User).filter(User.user_id == user_id).one()
     admin = db.query(User).filter(User.user_id == admin_id, User.role == "admin").one()

    # Check if the user exists
     if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Add only unique hierarchy_ids that do not exist in the user's hierarchy list
     user.hierarchy_ids = list(set(user.hierarchy_ids or []) | set(hierarchy_ids))

    # Add only unique hierarchy_ids that do not exist in the admin's hierarchy list
     admin.hierarchy_ids = list(set(admin.hierarchy_ids or []) | set(hierarchy_ids))

    # Commit the changes to the database
     db.commit()


    def assign_hierarchy_to_multiple_users(self,data: dict, session: Session = Depends(get_db)):
     print(data)
     try:
        user_ids = data.get("user_ids")
        admin_id = data.get("admin_id")
        hierarchy_ids = data.get("hierarchy_ids")  # Changed to match the request body

        for user_id in user_ids:
            print(
                f"Processing user_id: {user_id}, admin_id: {admin_id} , hierarchy_ids: {hierarchy_ids}"
            )

            user = session.query(User).filter(User.user_id == user_id).first()

            if user is not None:
                # Check if all hierarchy_ids exist in the Hierarchy table
                existing_hierarchies = (
                    session.query(Hierarchy)
                    .filter(Hierarchy.hierarchy_id.in_(hierarchy_ids))
                    .all()
                )

                if len(existing_hierarchies) != len(hierarchy_ids):
                    # Raise an exception if any hierarchy_id is not found
                    raise HTTPException(
                        status_code=404,
                        detail=f"One or more hierarchy IDs not found for user {user_id}",
                    )

                self.update_hierarchies(user_id, admin_id, hierarchy_ids, session)
            else:
                raise HTTPException(status_code=404, detail=f"user is not found")

        return {"message": f"Hierarchies assigned to users"}

     except HTTPException as e:
        print(f"Exception: {e}")
        raise e

