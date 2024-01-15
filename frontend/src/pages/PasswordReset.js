import Header from "../components/Header";
import Passwordreset from "../components/PasswordReset";
import configData from '../constants/config.json';

export default function PasswordresetPage() {
    return (
        <>
            <Header
                heading={configData.PasswordReset.Heading}
                linkName="Back to Login"
                linkUrl="/"
            />
            <Passwordreset />
        </>
    )
}
