import Header from "../components/Header";
import UserAccount from "../components/Account";
import configData from '../constants/config.json';

export default function UserAccountPage() {
    return (
        <>
            <Header
                heading={configData.UserAccount.Heading}
            />
            <UserAccount />
        </>
    )
}