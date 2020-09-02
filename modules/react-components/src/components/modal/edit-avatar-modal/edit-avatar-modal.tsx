/**
 * Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getGravatarImage } from "@wso2is/core/api";
import { GravatarFallbackTypes, TestableComponentInterface } from "@wso2is/core/models";
import { ProfileUtils } from "@wso2is/core/utils";
import React, {
    ChangeEvent,
    FormEvent,
    FunctionComponent,
    MouseEvent,
    ReactElement,
    ReactNode,
    SyntheticEvent,
    useEffect,
    useState
} from "react";
import {
    Card,
    CardProps,
    Checkbox,
    CheckboxProps,
    Dropdown,
    DropdownProps,
    Form,
    Grid,
    Input,
    Message,
    Modal,
    ModalProps
} from "semantic-ui-react";
import { UserAvatar } from "../../avatar";
import { LinkButton, PrimaryButton } from "../../button";
import { SelectionCard } from "../../card";

/**
 * Edit Avatar Modal props interface.
 */
export interface EditAvatarModalPropsInterface extends ModalProps, TestableComponentInterface {
    /**
     * Set of Emails to look for Gravatar.
     */
    emails?: string[];
    /**
     * Modal Heading.
     */
    heading?: ReactNode;
    /**
     * Name to use for system generated avatar.
     */
    name: string;
    /**
     * Cancel button text.
     */
    cancelButtonText?: string;
    /**
     * Submit button text.
     */
    submitButtonText?: string;
    /**
     * Callback function for the submit button.
     * @param {<HTMLButtonElement>} e - Event.
     * @param {string} url - Submitted URL.
     */
    onSubmit?: (e: MouseEvent<HTMLButtonElement>, url: string) => void;
    /**
     * Callback function for the cancel button.
     * @param {<HTMLButtonElement>} e - Event.
     */
    onCancel?: (e: MouseEvent<HTMLButtonElement>) => void;
}

const GRAVATAR_IMAGE_MIN_SIZE = 80;
const GRAVATAR_IMAGE_MAX_SIZE = 200;

const SystemGeneratedAvatars: Map<string, SystemGeneratedAvatarURLs> = new Map<string, SystemGeneratedAvatarURLs>([
    [ "Initials", "system_gen_i_1" ]
]);

export enum AvatarTypes {
    SYSTEM_GENERATED = "SYSTEM_GENERATED",
    GRAVATAR = "GRAVATAR",
    URL = "URL"
}

type SystemGeneratedAvatarURLs = "system_gen_i_1";

/**
 * Edit Avatar modal.
 *
 * @param {EditAvatarModalPropsInterface} props - Props injected to the component.
 * @return {React.ReactElement}
 */
export const EditAvatarModal: FunctionComponent<EditAvatarModalPropsInterface> = (
    props: EditAvatarModalPropsInterface
): ReactElement => {

    const {
        cancelButtonText,
        emails,
        heading,
        name,
        onCancel,
        onSubmit,
        submitButtonText,
        [ "data-testid" ]: testId,
        ...rest
    } = props;

    const [ selectedGravatarEmail, setSelectedGravatarEmail ] = useState<string>(undefined);
    const [ selectedGravatarSize, setSelectedGravatarSize ] = useState<number>(GRAVATAR_IMAGE_MIN_SIZE);
    const [ isInitialGravatarRequestLoading, setIsInitialGravatarRequestLoading ] = useState<boolean>(false);
    const [ isGravatarQualified, setIsGravatarQualified ] = useState<boolean>(undefined);
    const [ gravatarURLs, setGravatarURLs ] = useState<Map<string, string>>(undefined);
    const [ selectedAvatarType, setSelectedAvatarType ] = useState<AvatarTypes>(undefined);
    const [ customHostedURL, setCustomHostedURL ] = useState<string>(undefined);
    const [
        outputURL,
        setOutputURL
    ] = useState<SystemGeneratedAvatarURLs | string>(undefined);

    useEffect(() => {
        setSelectedAvatarType(AvatarTypes.SYSTEM_GENERATED);
    }, []);

    /**
     * Init selected gravatar email once `emails` prop is valid.
     */
    useEffect(() => {
        if (!emails || !Array.isArray(emails) || emails.length < 1) {
            return;
        }

        setSelectedGravatarEmail(emails[ 0 ]);
    }, [ emails ]);

    useEffect(() => {
        if (!selectedGravatarEmail) {
            return;
        }

        // Once the email selection is changed, switch the selected type to `Gravatar`.
        setSelectedAvatarType(AvatarTypes.GRAVATAR);

        setIsInitialGravatarRequestLoading(true);

        getGravatarImage(selectedGravatarEmail)
            .then((response) => {
                setIsGravatarQualified(true)
            })
            .catch((error) => {
                setIsGravatarQualified(false);
            })
            .finally(() => {
                setIsInitialGravatarRequestLoading(false);
            });
    }, [ selectedGravatarEmail ]);

    useEffect(() => {
        if (!selectedGravatarEmail || isGravatarQualified === undefined) {
            return;
        }

        const getURL = (fallback: GravatarFallbackTypes, forceDefault: boolean = true) =>
            ProfileUtils.buildGravatarURL(selectedGravatarEmail, selectedGravatarSize, null, fallback, forceDefault);

        const urls = new Map<string, string>();

        if (isGravatarQualified) {
            urls.set("Gravatar", getURL("default", false));
        }

        urls.set("Retro", getURL("retro"))
            .set("Default", getURL("default"))
            .set("Person", getURL("mp"))
            .set("Identicon", getURL("identicon"))
            .set("Monster", getURL("monsterid"))
            .set("Wavatar", getURL("wavatar"))
            .set("Robot", getURL("robohash"));

        setGravatarURLs(urls);
    }, [ selectedGravatarEmail, isGravatarQualified ]);

    useEffect(() => {
        if (selectedAvatarType === AvatarTypes.SYSTEM_GENERATED) {
            setOutputURL(SystemGeneratedAvatars.get("Initials"));
            
            return;
        }

        if (selectedAvatarType === AvatarTypes.GRAVATAR && gravatarURLs) {
            setOutputURL(gravatarURLs.get("Gravatar") ?? gravatarURLs.get("Retro"));
            
            return;
        }

        setOutputURL(customHostedURL);
    }, [ selectedAvatarType, gravatarURLs ]);

    const handleGravatarEmailDropdownChange = (e: SyntheticEvent<HTMLElement>, data: DropdownProps): void => {
        const { value } = data;
        setSelectedGravatarEmail(value as string);
    };

    const renderGravatarOptions = () => {

        if (!gravatarURLs) {
            return;
        }

        const elemArray = [];

        for (const [ key, value ] of gravatarURLs) {
            elemArray.push(
                <SelectionCard
                    id={ value }
                    size="x100"
                    header={ key }
                    image={
                        <UserAvatar
                            size="little"
                            image={ value }
                        />
                    }
                    selected={ outputURL === value }
                    onClick={ handleGravatarOptionChange }
                />
            )
        }

        return elemArray;
    };

    const handleSelectedAvatarTypeChange = (e: FormEvent<HTMLInputElement>, data: CheckboxProps) => {
        const { value } = data;
        setSelectedAvatarType(value as AvatarTypes);
    };

    const handleGravatarOptionChange = (e: MouseEvent<HTMLAnchorElement>, data: CardProps) => {
        const { id } = data;

        setOutputURL(id);
        setSelectedAvatarType(AvatarTypes.GRAVATAR);
    };

    const handleSystemGeneratedAvatarChange = (e: MouseEvent<HTMLAnchorElement>, data: CardProps) => {
        const { id } = data;

        setOutputURL(id);
        setSelectedAvatarType(AvatarTypes.SYSTEM_GENERATED);
    };

    const handleCustomHostedURLChange = (e: ChangeEvent<HTMLInputElement>, { value }: { value: string }): void => {
        setCustomHostedURL(value);
        setOutputURL(value);
    };

    const handleModalSubmit = (e: MouseEvent<HTMLButtonElement>) => {
        onSubmit(e, outputURL === SystemGeneratedAvatars.get("Initials") ? "" : outputURL);
    };

    return (
        <Modal
            data-testid={ testId }
            { ...rest }
        >
            <Modal.Header>{ heading }</Modal.Header>
            <Modal.Content>
                <Form>
                    <Grid>
                        {
                            name && (
                                <Grid.Row>
                                    <Grid.Column width={ 16 }>
                                        <div className="avatar-from-system">
                                            <div className="mb-3">
                                                <Form.Field>
                                                    <Checkbox
                                                        radio
                                                        value={ AvatarTypes.SYSTEM_GENERATED }
                                                        label="System generated avatar"
                                                        checked={ selectedAvatarType === AvatarTypes.SYSTEM_GENERATED }
                                                        onChange={ handleSelectedAvatarTypeChange }
                                                    />
                                                </Form.Field>
                                            </div>
                                            <Card.Group className="avatar-from-system-card-group">
                                                <SelectionCard
                                                    id={ SystemGeneratedAvatars.get("Initials") }
                                                    size="x100"
                                                    header="Initials"
                                                    image={
                                                        <UserAvatar
                                                            size="little"
                                                            name={ name }
                                                        />
                                                    }
                                                    selected={ outputURL === SystemGeneratedAvatars.get("Initials") }
                                                    onClick={ handleSystemGeneratedAvatarChange }
                                                />
                                            </Card.Group>
                                        </div>
                                    </Grid.Column>
                                </Grid.Row>
                            )
                        }
                        {
                            selectedGravatarEmail && (
                                <Grid.Row>
                                    <Grid.Column width={ 16 }>
                                        <div className="avatar-from-gravatar">
                                            <div className="mb-3">
                                                <Form.Field>
                                                    <Checkbox
                                                        radio
                                                        value={ AvatarTypes.GRAVATAR }
                                                        label={
                                                            <label>
                                                                <>
                                                                    <span>Gravatar based on </span>
                                                                    <Dropdown
                                                                        text={ selectedGravatarEmail }
                                                                        options={
                                                                            emails
                                                                                .map((email: string, index: number) => {
                                                                                    return {
                                                                                        key: index,
                                                                                        text: email,
                                                                                        value: email
                                                                                    }
                                                                                })
                                                                        }
                                                                        onChange={ handleGravatarEmailDropdownChange }
                                                                    />
                                                                </>
                                                            </label>
                                                        }
                                                        checked={ selectedAvatarType === AvatarTypes.GRAVATAR }
                                                        onChange={ handleSelectedAvatarTypeChange }
                                                    />
                                                </Form.Field>
                                            </div>
                                            {
                                                (!isInitialGravatarRequestLoading && !isGravatarQualified) && (
                                                    <Message
                                                        warning
                                                        visible
                                                        size="tiny"
                                                        header="No matching Gravatar image found!"
                                                        content={
                                                            <div>
                                                                It seems like { selectedGravatarEmail } is not registered on
                                                                Gravatar.
                                                                Sign up for a Gravatar account by clicking <a>here</a> or use
                                                                one of
                                                                the
                                                                following.
                                                            </div>
                                                        }
                                                    />
                                                )
                                            }
                                            <Card.Group className="avatar-from-gravatar-card-group">
                                                { renderGravatarOptions() }
                                            </Card.Group>
                                        </div>
                                    </Grid.Column>
                                </Grid.Row>
                            ) 
                        }
                        <Grid.Row>
                            <Grid.Column computer={ 8 } tablet={ 10 } mobile={ 16 }>
                                <div className="avatar-from-url">
                                    <div className="mb-3">
                                        <Form.Field>
                                            <Checkbox
                                                radio
                                                value={ AvatarTypes.URL }
                                                label="Hosted Image"
                                                checked={ selectedAvatarType === AvatarTypes.URL }
                                                onChange={ handleSelectedAvatarTypeChange }
                                            />
                                        </Form.Field>
                                    </div>
                                    <Input fluid icon placeholder="https://" onChange={ handleCustomHostedURLChange }/>
                                </div>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Form>
            </Modal.Content>
            <Modal.Actions>
                <LinkButton onClick={ onCancel }>
                    { cancelButtonText }
                </LinkButton>
                <PrimaryButton disabled={ !outputURL } onClick={ handleModalSubmit }>
                    { submitButtonText }
                </PrimaryButton>
            </Modal.Actions>
        </Modal>
    );
};

/**
 * Default props for the component.
 */
EditAvatarModal.defaultProps = {
    cancelButtonText: "Cancel",
    "data-testid": "edit-avatar-modal",
    dimmer: "blurring",
    heading: "Update profile picture",
    submitButtonText: "Save"
};
