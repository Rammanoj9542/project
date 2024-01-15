import UserHeader from "../components/HeaderSession";
import VideoRecorder from "../components/Video";
import configData from '../constants/config.json';

export default function Videopage() {
    return (
        <>
            <UserHeader
                heading={configData.Video.Heading}
            />
            <VideoRecorder />
        </>
    )
}