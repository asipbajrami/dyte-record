import React, { useEffect, useState, useCallback } from 'react';
import { debounce } from 'lodash';
import {
    DyteParticipantsAudio,
    DyteParticipantTile,
    DyteNameTag,
    DyteAudioVisualizer,
} from '@dytesdk/react-ui-kit';
import { useDyteMeeting, useDyteSelector } from '@dytesdk/react-web-core';
import { DyteParticipant } from '@dytesdk/web-core';
import logo from '../assets/logo.png';

const AFFIRMATIVE = 'affirmative';
const NEGATIVE = 'negative';
const JUDGE = 'judge';
const SOLO = 'solo';

type PresetName = typeof AFFIRMATIVE | typeof NEGATIVE | typeof JUDGE | typeof SOLO;

const presetColors: { [key in PresetName]: string } = {
    [AFFIRMATIVE]: '#043B6D',
    [NEGATIVE]: '#641316',
    [JUDGE]: '#0D0B0E',
    [SOLO]: '#471a55',
};

const ParticipantTile = React.memo(({
                                        participant,
                                        presetName,
                                        meeting,
                                        isActiveSpeaker,
                                        size = 'normal'
                                    }: {
    participant: DyteParticipant;
    presetName: PresetName;
    meeting: any;
    isActiveSpeaker: boolean;
    size?: 'normal' | 'large';
}) => {
    const [isVideoReady, setIsVideoReady] = useState(false);

    useEffect(() => {
        const checkVideoTrack = () => {
            // Fixed type checking for video track
            setIsVideoReady(participant.videoEnabled && participant.videoTrack ? true : false);
        };

        checkVideoTrack();
        const videoUpdateListener = () => {
            checkVideoTrack();
        };

        participant.on('videoUpdate', videoUpdateListener);

        return () => {
            participant.off('videoUpdate', videoUpdateListener);
        };
    }, [participant]);

    return (
        <div
            key={participant.id}
            className={`w-full relative rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${
                size === 'large' ? 'h-full' : ''
            }`}
            style={{
                border: isActiveSpeaker ? '4px solid #4CAF50' : '2px solid transparent',
                boxShadow: isActiveSpeaker ? '0 0 20px rgba(76, 175, 80, 0.5)' : 'none',
            }}
        >
            <div
                className="relative w-full"
                style={{
                    paddingTop: size === 'large' ? '75%' : '56.25%',
                }}
            >
                <DyteParticipantTile
                    key={participant.id}
                    participant={participant}
                    meeting={meeting}
                    className="absolute top-0 left-0 w-full h-full transition-all duration-300"
                >
                    <DyteNameTag
                        participant={participant}
                        style={{
                            backgroundColor: presetColors[presetName],
                            color: 'white',
                        }}
                    >
                        <DyteAudioVisualizer participant={participant} slot="start" />
                    </DyteNameTag>
                </DyteParticipantTile>
            </div>
            {!isVideoReady && (
                <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-50 text-white">
                    Loading...
                </div>
            )}
        </div>
    );
});

export default function RecordingView() {
    const { meeting } = useDyteMeeting();
    const [participants, setParticipants] = useState<DyteParticipant[]>([]);
    const lastActiveSpeaker = useDyteSelector(
        (meeting) => meeting.participants.lastActiveSpeaker
    );
    const joinedParticipants = useDyteSelector((meeting) =>
        meeting.participants.joined.toArray()
    );

    const debouncedSetParticipants = useCallback(
        debounce((updater: (prev: DyteParticipant[]) => DyteParticipant[]) => {
            setParticipants(updater);
        }, 100),
        []
    );

    useEffect(() => {
        debouncedSetParticipants(() => joinedParticipants);

        const handleParticipantJoin = (participant: DyteParticipant) => {
            debouncedSetParticipants((prev) => [...prev, participant]);
        };

        const handleParticipantLeave = (participant: DyteParticipant) => {
            debouncedSetParticipants((prev) => prev.filter((p) => p.id !== participant.id));
        };

        meeting.participants.joined.on('participantJoined', handleParticipantJoin);
        meeting.participants.joined.on('participantLeft', handleParticipantLeave);

        return () => {
            meeting.participants.joined.off('participantJoined', handleParticipantJoin);
            meeting.participants.joined.off('participantLeft', handleParticipantLeave);
        };
    }, [meeting, joinedParticipants, debouncedSetParticipants]);

    const getParticipantsByPreset = (
        presetNames: PresetName | PresetName[]
    ): DyteParticipant[] => {
        const names = Array.isArray(presetNames) ? presetNames : [presetNames];
        return participants.filter(
            (p) => p.presetName && names.includes(p.presetName as PresetName)
        );
    };

    const negativeParticipants = getParticipantsByPreset(NEGATIVE);
    const affirmativeParticipants = getParticipantsByPreset(AFFIRMATIVE);
    const judgeParticipants = getParticipantsByPreset(JUDGE);
    const soloParticipants = getParticipantsByPreset(SOLO);

    const isSpecialLayout =
        (negativeParticipants.length === 1 || soloParticipants.length === 1) &&
        affirmativeParticipants.length === 1 &&
        judgeParticipants.length === 1;

    const leftColumnParticipants = [...negativeParticipants];
    const rightColumnParticipants = [...affirmativeParticipants];

    soloParticipants.forEach((participant, index) => {
        if (index % 2 === 0) {
            leftColumnParticipants.push(participant);
        } else {
            rightColumnParticipants.push(participant);
        }
    });

    if (isSpecialLayout) {
        return (
            <main className="flex flex-col w-screen h-screen bg-black text-white overflow-hidden">
                <div className="flex flex-1 p-4">
                    <div className="flex w-full gap-4">
                        {/* Left participant (Negative or Solo) */}
                        <div className="w-1/2 h-full">
                            <ParticipantTile
                                participant={leftColumnParticipants[0]}
                                presetName={leftColumnParticipants[0].presetName as PresetName}
                                meeting={meeting}
                                isActiveSpeaker={lastActiveSpeaker === leftColumnParticipants[0].id}
                                size="large"
                            />
                        </div>

                        {/* Right participant (Affirmative) */}
                        <div className="w-1/2 h-full">
                            <ParticipantTile
                                participant={rightColumnParticipants[0]}
                                presetName={rightColumnParticipants[0].presetName as PresetName}
                                meeting={meeting}
                                isActiveSpeaker={lastActiveSpeaker === rightColumnParticipants[0].id}
                                size="large"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Judge */}
                <div className="w-full h-64 p-4">
                    <ParticipantTile
                        participant={judgeParticipants[0]}
                        presetName={JUDGE}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === judgeParticipants[0].id}
                    />
                </div>
                <DyteParticipantsAudio meeting={meeting} />
            </main>
        );
    }

    return (
        <main className="flex flex-col w-screen h-screen bg-black text-white overflow-hidden">
            <div className="flex flex-1 relative overflow-hidden">
                {/* Left Column */}
                <div className="w-1/3 p-4 grid gap-4" style={{ gridTemplateRows: `repeat(${leftColumnParticipants.length}, 1fr)` }}>
                    {leftColumnParticipants.map((participant) => (
                        <ParticipantTile
                            key={participant.id}
                            participant={participant}
                            presetName={participant.presetName as PresetName}
                            meeting={meeting}
                            isActiveSpeaker={lastActiveSpeaker === participant.id}
                        />
                    ))}
                </div>

                {/* Center Column */}
                <div className="w-1/3 flex flex-col justify-center items-center p-4">
                    <div className="w-full grid gap-4" style={{ gridTemplateRows: `repeat(${judgeParticipants.length}, 1fr)` }}>
                        {judgeParticipants.map((participant) => (
                            <ParticipantTile
                                key={participant.id}
                                participant={participant}
                                presetName={JUDGE}
                                meeting={meeting}
                                isActiveSpeaker={lastActiveSpeaker === participant.id}
                            />
                        ))}
                    </div>
                    <div className="mt-5">
                        <img
                            src={logo}
                            alt="Logo"
                            className="max-w-[150px] max-h-[150px] object-contain"
                        />
                    </div>
                </div>

                {/* Right Column */}
                <div className="w-1/3 p-4 grid gap-4" style={{ gridTemplateRows: `repeat(${rightColumnParticipants.length}, 1fr)` }}>
                    {rightColumnParticipants.map((participant) => (
                        <ParticipantTile
                            key={participant.id}
                            participant={participant}
                            presetName={participant.presetName as PresetName}
                            meeting={meeting}
                            isActiveSpeaker={lastActiveSpeaker === participant.id}
                        />
                    ))}
                </div>
            </div>
            <DyteParticipantsAudio meeting={meeting} />
        </main>
    );
}