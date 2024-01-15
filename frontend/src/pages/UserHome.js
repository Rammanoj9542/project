import UserHeader from "../components/HeaderUser";
import UserHome from "../components/UserHome";
import configData from '../constants/config.json';

export default function UserHomepage() {
    return (
        <>
            <UserHeader
                heading={configData.UserHome.Heading}
            />
            <UserHome />
        </>
    )
}