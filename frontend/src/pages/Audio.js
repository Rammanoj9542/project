import UserHeader from "../components/HeaderSession";
import AudioRecorder from "../components/Audio";
import configData from '../constants/config.json';

export default function Audiopage() {
    return (
        <>
            <UserHeader
                heading={configData.Audio.Heading}
            />
            <AudioRecorder />
        </>
    )
}