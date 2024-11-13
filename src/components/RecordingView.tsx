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
    [AFFIRMATIVE]: '#043B6D', // Blue
    [NEGATIVE]: '#641316',    // Red
    [JUDGE]: '#0D0B0E',      // Black
    [SOLO]: '#471a55',       // Purple
};

const ParticipantTile = React.memo(({
                                        participant,
                                        presetName,
                                        meeting,
                                        isActiveSpeaker,
                                        style,
                                    }: {
    participant: DyteParticipant;
    presetName: PresetName;
    meeting: any;
    isActiveSpeaker: boolean;
    style?: React.CSSProperties;
}) => {
    const [isVideoReady, setIsVideoReady] = useState(false);

    useEffect(() => {
        const checkVideoTrack = () => {
            if (participant.videoEnabled && participant.videoTrack) {
                setIsVideoReady(true);
            } else {
                setIsVideoReady(false);
            }
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
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid',
                borderColor: isActiveSpeaker ? 'white' : 'transparent',
                transition: 'border-color 0.3s ease-in-out',
                ...style,
            }}
        >
            <DyteParticipantTile
                participant={participant}
                meeting={meeting}
                style={{
                    width: '100%',
                    height: '100%',
                    transition: 'all 0.3s ease-in-out',
                }}
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
            {!isVideoReady && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                }}>
                    Loading...
                </div>
            )}
        </div>
    );
});

const renderSpecialLayout = (
    negativeParticipant: DyteParticipant,
    affirmativeParticipant: DyteParticipant,
    judgeParticipant: DyteParticipant,
    lastActiveSpeaker: string,
    meeting: any
) => {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '20px',
        }}>
            {/* Top row with negative and affirmative */}
            <div style={{
                display: 'flex',
                flex: 1,
                gap: '20px',
                minHeight: '60%',
            }}>
                <ParticipantTile
                    participant={negativeParticipant}
                    presetName={NEGATIVE}
                    meeting={meeting}
                    isActiveSpeaker={lastActiveSpeaker === negativeParticipant.id}
                    style={{ flex: 1 }}
                />
                <ParticipantTile
                    participant={affirmativeParticipant}
                    presetName={AFFIRMATIVE}
                    meeting={meeting}
                    isActiveSpeaker={lastActiveSpeaker === affirmativeParticipant.id}
                    style={{ flex: 1 }}
                />
            </div>

            {/* Bottom row with judge and logo */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                minHeight: '35%',
            }}>
                <div style={{ width: '50%', height: '100%' }}>
                    <ParticipantTile
                        participant={judgeParticipant}
                        presetName={JUDGE}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === judgeParticipant.id}
                    />
                </div>
                <img
                    src={logo}
                    alt="Logo"
                    style={{
                        maxWidth: '150px',
                        maxHeight: '150px',
                        objectFit: 'contain',
                    }}
                />
            </div>
        </div>
    );
};

const renderDefaultLayout = (
    leftColumnParticipants: DyteParticipant[],
    rightColumnParticipants: DyteParticipant[],
    judgeParticipants: DyteParticipant[],
    lastActiveSpeaker: string,
    meeting: any
) => {
    return (
        <div
            style={{
                display: 'flex',
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    width: '33.33%',
                    padding: '10px',
                    display: 'grid',
                    gridTemplateRows: `repeat(${leftColumnParticipants.length}, 1fr)`,
                    gap: '10px',
                }}
            >
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

            <div
                style={{
                    width: '33.33%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '10px',
                    gap: '10px',
                }}
            >
                {judgeParticipants.map((participant) => (
                    <ParticipantTile
                        key={participant.id}
                        participant={participant}
                        presetName={JUDGE}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === participant.id}
                    />
                ))}
                <img
                    src={logo}
                    alt="Logo"
                    style={{
                        maxWidth: '150px',
                        maxHeight: '150px',
                        objectFit: 'contain',
                        marginTop: '10px',
                    }}
                />
            </div>

            <div
                style={{
                    width: '33.33%',
                    padding: '10px',
                    display: 'grid',
                    gridTemplateRows: `repeat(${rightColumnParticipants.length}, 1fr)`,
                    gap: '10px',
                }}
            >
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
    );
};

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

    const leftColumnParticipants = [...negativeParticipants];
    const rightColumnParticipants = [...affirmativeParticipants];

    soloParticipants.forEach((participant, index) => {
        if (index % 2 === 0) {
            leftColumnParticipants.push(participant);
        } else {
            rightColumnParticipants.push(participant);
        }
    });

    // Check for special case: exactly 1 negative, 1 affirmative, and 1 judge
    const isSpecialCase = negativeParticipants.length === 1 &&
        affirmativeParticipants.length === 1 &&
        judgeParticipants.length === 1;

    return (
        <main
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100vw',
                height: '100vh',
                backgroundColor: '#000',
                color: 'white',
                overflow: 'hidden',
            }}
        >
            {isSpecialCase ? (
                renderSpecialLayout(
                    negativeParticipants[0],
                    affirmativeParticipants[0],
                    judgeParticipants[0],
                    lastActiveSpeaker,
                    meeting
                )
            ) : (
                renderDefaultLayout(
                    leftColumnParticipants,
                    rightColumnParticipants,
                    judgeParticipants,
                    lastActiveSpeaker,
                    meeting
                )
            )}
            <DyteParticipantsAudio meeting={meeting} />
        </main>
    );
}