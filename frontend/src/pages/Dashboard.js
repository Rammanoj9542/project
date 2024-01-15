import AdminHeader from "../components/HeaderAdmin";
import Dashboard from "../components/Dashboard";
import configData from '../constants/config.json';

export default function Dashboardpage() {
    return (
        <>
            <AdminHeader
                heading={configData.Dashboard.Heading}
            />
            <Dashboard />
        </>
    )
}