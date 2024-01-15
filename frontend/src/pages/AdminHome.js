import AdminHeader from "../components/HeaderAdmin";
import AdminHome from "../components/AdminHome";
import configData from '../constants/config.json';

export default function AdminHomepage() {
    return (
        <>
            <AdminHeader
                heading={configData.AdminHome.Heading}
            />
            <AdminHome />
        </>
    )
}