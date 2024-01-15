import AdminHeader from "../components/HeaderAdmin";
import Userregistration from "../components/UserRegistration";
import configData from '../constants/config.json';

export default function UserregistrationPage() {
    return (
        <>
            <AdminHeader
                heading={configData.UserRegistration.Heading}
            />
            <Userregistration />
        </>
    )
}