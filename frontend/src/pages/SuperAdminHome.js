import SuperAdminHeader from "../components/HeaderSuperAdmin";
import SuperAdminHome from "../components/SuperAdminHome";
import configData from '../constants/config.json';

export default function SuperAdminHomepage() {
    return (
        <>
            <SuperAdminHeader
                heading={configData.SuperAdminHome.Heading}
            />
            <SuperAdminHome />
        </>
    )
}