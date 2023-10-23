/**
 * Copyright (c) 2020, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
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

import { AlertLevels, RolesInterface, TestableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { useTrigger } from "@wso2is/forms";
import { Heading, LinkButton, PrimaryButton, Steps, useWizardAlert } from "@wso2is/react-components";
import { AxiosError, AxiosResponse } from "axios";
import cloneDeep from "lodash-es/cloneDeep";
import intersection from "lodash-es/intersection";
import merge from "lodash-es/merge";
import React, { FunctionComponent, ReactElement, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch } from "redux";
import { Grid, Icon, Modal } from "semantic-ui-react";
import { RolePermissions } from "./user-role-permissions";
import { AddUserWizardSummary } from "./wizard-summary";
// Keep statement as this to avoid cyclic dependency. Do not import from config index.
import { UserAccountTypes } from "../../../../extensions/components/users/constants";
import { SCIMConfigs } from "../../../../extensions/configs/scim";
import { AppConstants } from "../../../core/constants";
import { history } from "../../../core/helpers";
import { AppState } from "../../../core/store";
import { getGroupList, updateGroupDetails } from "../../../groups/api";
import { getOrganizationRoles } from "../../../organizations/api";
import { OrganizationRoleManagementConstants } from "../../../organizations/constants";
import { OrganizationResponseInterface, OrganizationRoleListItemInterface,
    OrganizationRoleListResponseInterface } from "../../../organizations/models";
import { OrganizationUtils } from "../../../organizations/utils";
import { getRolesList, updateRoleDetails } from "../../../roles/api";
import { addUser } from "../../api";
import { getUserWizardStepIcons } from "../../configs";
import { 
    AddUserWizardStateInterface, 
    PayloadInterface, 
    UserDetailsInterface,
    WizardStepInterface, 
    createEmptyUserDetails,
    BasicUserDetailsInterface } from "../../models";
import { AddUser } from "../add-user";
import { AddUserGroup } from "../add-user-groups";
import { AddUserRole } from "../add-user-role";
import { UserAccountTypesMain } from "../../constants";
import { AdminAccountTypes } from "../../constants";
import { GroupsInterface } from "../../../groups";
import { UserTypeSelection } from "apps/console/src/extensions/components/users/wizard";
import { AddConsumerUserGroups } from "./steps/consumer-user-groups";
import { AddConsumerUserWizardSummary } from "./steps/add-consumer-user-wizard-summary";
import { getUsernameConfiguration } from "../../utils";
import { useValidationConfigData } from "../../../validation/api";
import { UserInviteInterface } from "apps/console/src/extensions/components/users/models";
import { sendParentOrgUserInvite } from "../guests/api/invite";
import { UsersConstants } from "../../../../extensions/components/users/constants";
import { InviteParentOrgUser } from "../guests/pages/invite-parent-org-user";
import { InternalAdminFormDataInterface } from "apps/console/src/extensions/components/users/models";

interface AddUserWizardPropsInterface extends TestableComponentInterface {
    closeWizard: () => void;
    compact?: boolean;
    currentStep?: number;
    submitStep?: WizardStepsFormTypes | string;
    listOffset: number;
    listItemLimit: number;
    updateList: () => void;
    onSuccessfulUserAddition?: (id: string) => void;
    rolesList?: any;
    emailVerificationEnabled: boolean;
    isAdminUser?: boolean;
    userTypeSelection?: string
    defaultUserTypeSelection?: string;
    adminTypeSelection? :string;
    isSubOrg?: boolean
    showStepper?: boolean;
    conditionallyShowStepper?: boolean;
    requiredSteps?: WizardStepsFormTypes[] | string[];
    userStore?: string;
}

/**
 * Interface for the wizard state.
 */
interface WizardStateInterface {
    [ key: string ]: any;
}

/**
 * Enum for wizard steps form types.
 * @readonly
 */
enum WizardStepsFormTypes {
    BASIC_DETAILS = "BasicDetails",
    ROLE_LIST= "RoleList",
    GROUP_LIST= "GroupList",
    SUMMARY = "summary",
    USER_TYPE = "UserType",
    USER_SUMMARY = "UserSummary"
}

/**
 * User creation wizard.
 *
 * @returns User creation wizard.
 */
export const AddUserWizard: FunctionComponent<AddUserWizardPropsInterface> = (
    props: AddUserWizardPropsInterface
): ReactElement => {

    const {
        closeWizard,
        currentStep,
        compact,
        emailVerificationEnabled,
        isAdminUser,
        onSuccessfulUserAddition,
        userTypeSelection,
        defaultUserTypeSelection,
        adminTypeSelection,
        isSubOrg,
        showStepper,
        submitStep,
        conditionallyShowStepper,
        requiredSteps,
        userStore,
        [ "data-testid" ]: testId
    } = props;

    const { t } = useTranslation();
    const dispatch: Dispatch = useDispatch();

    const [ submitGeneralSettings, setSubmitGeneralSettings ] = useTrigger();
    const [ submitRoleList, setSubmitRoleList ] = useTrigger();
    const [ submitGroupList, setSubmitGroupList ] = useTrigger();
    const [ finishSubmit, setFinishSubmit ] = useTrigger();
    const [ submitUserTypeSelection, setSubmitUserTypeSelection ] = useTrigger();

    const [ partiallyCompletedStep, setPartiallyCompletedStep ] = useState<number>(undefined);
    const [ currentWizardStep, setCurrentWizardStep ] = useState<number>(currentStep);
    const [ wizardState, setWizardState ] = useState<WizardStateInterface>(undefined);
    const [ fixedGroupList, setFixedGroupsList ] = useState<GroupsInterface[]>(undefined)

    const [ roleList, setRoleList ] = useState<RolesInterface[] | OrganizationRoleListItemInterface[]>([]);
    const [ tempRoleList, setTempRoleList ] = useState<RolesInterface[] | OrganizationRoleListItemInterface[]>(
        []);
    const [ initialRoleList, setInitialRoleList ] = useState<RolesInterface[] | OrganizationRoleListItemInterface[]>(
        []);
    const [ initialTempRoleList, setInitialTempRoleList ] = useState<RolesInterface[]
        | OrganizationRoleListItemInterface[]>([]);

    const [ groupList, setGroupsList ] = useState<GroupsInterface[]>([]);
    const [ tempGroupList, setTempGroupList ] = useState<GroupsInterface[]>([]);
    const [ initialGroupList, setInitialGroupList ] = useState<GroupsInterface[]>([]);
    const [ initialTempGroupList, setInitialTempGroupList ] = useState<GroupsInterface[]>([]);

    const [ viewRolePermissions, setViewRolePermissions ] = useState<boolean>(false);
    const [ selectedRoleId,  setSelectedRoleId ] = useState<string>();
    const [ isRoleSelected, setRoleSelection ] = useState<boolean>(false);
    const [ isSubmitting, setIsSubmitting ] = useState<boolean>(false);
    const [ viewNextButton, setViewNextButton ] = useState<boolean>(true);
    const [ isUserSummaryEnabled, setUserSummaryEnabled ] = useState(false);
    const [ isStepsUpdated, setIsStepsUpdated ] = useState(false);
    const [ isAlphanumericUsername, setIsAlphanumericUsername ] = useState<boolean>(false);
    const [ askPasswordFromUser, setAskPasswordFromUser ] = useState<boolean>(true);
    const [ isFinishButtonDisabled, setFinishButtonDisabled ] = useState<boolean>(false);
    const [ isBasicDetailsLoading, setBasicDetailsLoading ] = useState<boolean>(false);

    const currentOrganization: OrganizationResponseInterface = useSelector((state: AppState) =>
        state.organization.organization);
    const isRootOrganization: boolean = useMemo(() =>
        OrganizationUtils.isRootOrganization(currentOrganization), [ currentOrganization ]);

    const [ alert, setAlert, alertComponent ] = useWizardAlert();

    const [ wizardSteps, setWizardSteps ] = useState<WizardStepInterface[]>([]);

    const [ selectedUserStore, setSelectedUserStore ] = useState<string>("PRIMARY"); //TODO change
    const excludedAttributes: string = "members";

    const {
        data: validationData
    } = useValidationConfigData();

    useEffect(() => {
        setSelectedUserStore(userStore);
    }, [userStore]);

    useEffect(() => {
        if (currentWizardStep != 3) {
            setViewRolePermissions(false);
        }
        setViewNextButton(true);
    }, [ currentWizardStep ]);

    useEffect(() => {
        if (defaultUserTypeSelection === UserAccountTypes.USER) {
            getGroupListForDomain(selectedUserStore);
        } else {
            setGroupsList([]);
            setInitialGroupList([]);
            setFixedGroupsList([]);
        }
    }, [ selectedUserStore ]);

    useEffect(() => {

        if (!defaultUserTypeSelection) {
            return;
        }

        setWizardState({
            ...wizardState,
            [ WizardStepsFormTypes.USER_TYPE ]: {
                userType: defaultUserTypeSelection
            }
        });

    }, [ defaultUserTypeSelection ]);

    useEffect(() => {
        setIsAlphanumericUsername(
            getUsernameConfiguration(validationData)?.enableValidator === "true"
                ? true
                : false
        );
    }, [ validationData ]);

    useEffect(() => {
        if (!selectedRoleId) {
            return;
        }

        if (isRoleSelected) {
            setViewRolePermissions(true);
        }
    }, [ isRoleSelected ]);

    useEffect(() => {
        if (initialRoleList.length === 0) {
            if (isRootOrganization) {
                // Get Roles from the SCIM API
                getRolesList(null)
                    .then((response: AxiosResponse) => {
                        setRoleList(response.data.Resources);
                        setInitialRoleList(response.data.Resources);
                    });
            } else {
                // Get Roles from the Organization API
                getOrganizationRoles(currentOrganization.id, null, 100, null)
                    .then((response: OrganizationRoleListResponseInterface) => {
                        if (!response.Resources) {
                            return;
                        }

                        const roles: OrganizationRoleListItemInterface[] = response.Resources
                            .filter((role: OrganizationRoleListItemInterface) =>
                                role.displayName !== OrganizationRoleManagementConstants.ORG_CREATOR_ROLE_NAME);

                        setRoleList(roles);
                        setInitialRoleList(roles);
                    });
            }
        }

    }, []);

    /**
     * Sets the current wizard step to the previous on every `partiallyCompletedStep`
     * value change , and resets the partially completed step value.
     */
    useEffect(() => {
        if (partiallyCompletedStep === undefined) {
            return;
        }

        setCurrentWizardStep(currentWizardStep - 1);
        setPartiallyCompletedStep(undefined);
    }, [ partiallyCompletedStep ]);

    useEffect(() => {
        if ( wizardState && wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.domain) {
            getGroupListForDomain(wizardState && wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.domain);
        }
    }, [ wizardState && wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.domain ]);

    useEffect(() => {

        if (!wizardState) {
            return;
        }

        if (!fixedGroupList) {
            return;
        }

        if (wizardState[ WizardStepsFormTypes.USER_TYPE ].userType === UserAccountTypes.USER) {
            if (fixedGroupList?.length === 0) {
                if (isUserSummaryEnabled) {
                    setWizardSteps(filterSteps([
                        WizardStepsFormTypes.BASIC_DETAILS,
                        WizardStepsFormTypes.USER_SUMMARY
                    ]));
                    setIsStepsUpdated(true);

                    return;
                }
                setWizardSteps(filterSteps([
                    // Temporarily disable the USER_TYPE step.
                    // WizardStepsFormTypes.USER_TYPE,
                    WizardStepsFormTypes.BASIC_DETAILS
                    // Commented to temporarily disable the summary step.
                    // ,
                    // WizardStepsFormTypes.SUMMARY
                ]));
                setIsStepsUpdated(true);

                return;
            } 

            if (isUserSummaryEnabled) {
                setWizardSteps(filterSteps([
                    WizardStepsFormTypes.BASIC_DETAILS,
                    WizardStepsFormTypes.GROUP_LIST,
                    WizardStepsFormTypes.USER_SUMMARY
                ]));
                setIsStepsUpdated(true);

                return;
            }

            setWizardSteps(filterSteps([
                // Temporarily disable the USER_TYPE step.
                // WizardStepsFormTypes.USER_TYPE,
                WizardStepsFormTypes.BASIC_DETAILS,
                WizardStepsFormTypes.GROUP_LIST
                // Commented to temporarily disable the summary step.
                // ,
                // WizardStepsFormTypes.SUMMARY
            ]));
            setIsStepsUpdated(true);
        } else {
            setWizardSteps(filterSteps([
                // Temporarily disable the USER_TYPE step.
                // WizardStepsFormTypes.USER_TYPE,
                WizardStepsFormTypes.BASIC_DETAILS ]));
            setIsStepsUpdated(true);
        }

    }, [ fixedGroupList, wizardState && wizardState[ WizardStepsFormTypes.USER_TYPE ].userType, 
        isUserSummaryEnabled, defaultUserTypeSelection ]);

    const getGroupListForDomain = (domain: string) => {
        setBasicDetailsLoading(true);
        getGroupList(domain, excludedAttributes)
            .then((response: AxiosResponse) => {
                if (response.data.totalResults == 0) {
                    setGroupsList([]);
                    setInitialGroupList([]);
                    setFixedGroupsList([]);
                } else {
                    setGroupsList(response.data.Resources);
                    setInitialGroupList(response.data.Resources);
                    setFixedGroupsList(response.data.Resources);
                }
            })
            .finally(() => setBasicDetailsLoading(false));
    };

    /**
     * Filters the steps evaluating the requested steps.
     *
     * @param steps - Steps to filter.
     * @returns Filtered steps.
     */
    const filterSteps = (steps: WizardStepsFormTypes[]): WizardStepInterface[] => {

        const getStepContent = (stepsToFilter: WizardStepsFormTypes[] | string[]) => {

            const filteredSteps: any[] = [];

            stepsToFilter.forEach((step: WizardStepsFormTypes) => {
                if (step === WizardStepsFormTypes.USER_TYPE) {
                    filteredSteps.push(getUserSelectionWizardStep());
                } else if (step === WizardStepsFormTypes.BASIC_DETAILS) {
                    filteredSteps.push(resolveBasicDetailsStep());
                } else if (step === WizardStepsFormTypes.GROUP_LIST) {
                    filteredSteps.push(getUserGroupsWizardStep());
                } else if (step === WizardStepsFormTypes.SUMMARY) {
                    filteredSteps.push(getSummaryWizardStep());
                } else if (step === WizardStepsFormTypes.USER_SUMMARY) {
                    filteredSteps.push(getUserSummaryWizardStep());
                }
            });

            return filteredSteps;
        };

        if (!requiredSteps) {
            return getStepContent(steps);
        }

        return getStepContent(intersection(steps, requiredSteps));
    };

    /**
     * User Type Selection Wizard Step.
     * @returns User type wizard step.
     */
    const getUserSelectionWizardStep = (): WizardStepInterface => {

        return {
            content: (
                <UserTypeSelection
                    handleTriggerSubmit={ () => setSubmitUserTypeSelection }
                    triggerSubmit={ submitUserTypeSelection }
                    initialValues={ wizardState && wizardState[ WizardStepsFormTypes.USER_TYPE ] }
                    onSubmit={ (values: { userType: string }) => 
                        handleWizardFormSubmit(values, WizardStepsFormTypes.USER_TYPE) }
                />
            ),
            icon: getUserWizardStepIcons().user,
            name: WizardStepsFormTypes.USER_TYPE,
            title: "User Type"
        };
    };

    const handleViewRolePermission = () => {
        setViewRolePermissions(!viewRolePermissions);
        setRoleSelection(false);
    };

    const handleViewNextButton = (show: boolean) => {
        setViewNextButton(show);
    };

    const handleRoleIdSet = (roleId: string) => {
        setSelectedRoleId(roleId);
        setRoleSelection(true);
    };

    const handleRoleListChange = (roleList: RolesInterface[] | OrganizationRoleListItemInterface[]) => {
        setRoleList(roleList);
    };

    const handleInitialRoleListChange = (roleList: RolesInterface[] | OrganizationRoleListItemInterface[]) => {
        setInitialRoleList(roleList);
    };

    const handleAddedListChange = (newRoleList: RolesInterface[] | OrganizationRoleListItemInterface[]) => {
        setTempRoleList(newRoleList);
    };

    const handleAddedRoleInitialListChange = (newRoleList: RolesInterface[] | OrganizationRoleListItemInterface[]) => {
        setInitialTempRoleList(newRoleList);
    };

    const handleGroupListChange = (groupList: GroupsInterface[]) => {
        setGroupsList(groupList);
    };

    const handleInitialGroupListChange = (groupList: GroupsInterface[]) => {
        setInitialGroupList(groupList);
    };

    const handleAddedGroupListChange = (newGroupList: GroupsInterface[]) => {
        setTempGroupList(newGroupList);
    };

    const handleAddedGroupInitialListChange = (newGroupList: GroupsInterface[]) => {
        setInitialTempGroupList(newGroupList);
    };

    const navigateToNext = () => {
        // debugger
        // console.log("STEP: ", currentWizardStep)
        switch (currentWizardStep) {
            case 0:
                setSubmitGeneralSettings();

                break;
            case 1:
                isAdminUser
                    ? setFinishSubmit()
                    : setSubmitGroupList();

                break;
            case 2:
                OrganizationUtils.isCurrentOrganizationRoot()
                    ? setSubmitRoleList()
                    : setFinishSubmit();

                break;
            case 3:
                setFinishSubmit();
        }
    };

    const navigateToPrevious = () => {
        setPartiallyCompletedStep(currentWizardStep);
    };

    /**
     * This function handles assigning the roles to the user.
     */
    const assignUserRole = (user: any, roles: any, groups: any) => {
        const roleIds: string[] = [];
        const groupIds: string[] = [];

        // Payload for the update role request.
        const roleData: PayloadInterface = {
            Operations: [
                {
                    op: "add",
                    value: {
                        users: [
                            {
                                display: user.userName,
                                value: user.id
                            }
                        ]
                    }
                }
            ],
            schemas: [ "urn:ietf:params:scim:api:messages:2.0:PatchOp" ]
        };

        // Payload for the update group request.
        const groupData: PayloadInterface = {
            Operations: [
                {
                    op: "add",
                    value: {
                        members: [
                            {
                                display: user.userName,
                                value: user.id
                            }
                        ]
                    }
                }
            ],
            schemas: [ "urn:ietf:params:scim:api:messages:2.0:PatchOp" ]
        };

        if (roles.length > 0) {
            roles.map((role: RolesInterface | OrganizationRoleListItemInterface) => {
                roleIds.push(role.id);
            });

            for (const roleId of roleIds) {
                updateRoleDetails(roleId, roleData)
                    .catch((error: AxiosError) => {
                        if (!error.response || error.response.status === 401) {
                            setAlert({
                                description: t(
                                    "console:manage.features.users.notifications.addUser.error.description"
                                ),
                                level: AlertLevels.ERROR,
                                message: t(
                                    "console:manage.features.users.notifications.addUser.error.message"
                                )
                            });
                        } else if (error.response && error.response.data && error.response.data.detail) {

                            setAlert({
                                description: t(
                                    "console:manage.features.users.notifications.addUser.error.description",
                                    { description: error.response.data.detail }
                                ),
                                level: AlertLevels.ERROR,
                                message: t(
                                    "console:manage.features.users.notifications.addUser.error.message"
                                )
                            });
                        } else {
                            // Generic error message
                            setAlert({
                                description: t(
                                    "console:manage.features.users.notifications.addUser.genericError.description"
                                ),
                                level: AlertLevels.ERROR,
                                message: t(
                                    "console:manage.features.users.notifications.addUser.genericError.message"
                                )
                            });
                        }
                    });
            }
        }

        if (groups.length > 0) {
            groups.map((group: RolesInterface) => {
                groupIds.push(group.id);
            });

            for (const groupId of groupIds) {
                updateGroupDetails(groupId, groupData)
                    .catch((error: AxiosError) => {
                        if (!error.response || error.response.status === 401) {
                            setAlert({
                                description: t(
                                    "console:manage.features.users.notifications.addUser.error.description"
                                ),
                                level: AlertLevels.ERROR,
                                message: t(
                                    "console:manage.features.users.notifications.addUser.error.message"
                                )
                            });
                        } else if (error.response && error.response.data && error.response.data.detail) {

                            setAlert({
                                description: t(
                                    "console:manage.features.users.notifications.addUser.error.description",
                                    { description: error.response.data.detail }
                                ),
                                level: AlertLevels.ERROR,
                                message: t(
                                    "console:manage.features.users.notifications.addUser.error.message"
                                )
                            });
                        } else {
                            // Generic error message
                            setAlert({
                                description: t(
                                    "console:manage.features.users.notifications.addUser.genericError.description"
                                ),
                                level: AlertLevels.ERROR,
                                message: t(
                                    "console:manage.features.users.notifications.addUser.genericError.message"
                                )
                            });
                        }
                    });
            }
        }
    };

    /**
     * This function handles adding the user.
     */
    const addUserBasic = (userInfo: AddUserWizardStateInterface) => {
        let userName: string = "";

        userInfo.domain !== "primary"
            ? userName = userInfo.domain + "/" + userInfo.userName
            : userName = userInfo.userName;

        let userDetails: UserDetailsInterface = createEmptyUserDetails();
        const password: string = userInfo.newPassword;

        userInfo.passwordOption && userInfo.passwordOption !== "ask-password"
            ? (
                userDetails = {
                    emails:[
                        {
                            primary: true,
                            value: userInfo.email
                        }
                    ],
                    name: {
                        familyName: userInfo.lastName,
                        givenName: userInfo.firstName
                    },
                    password,
                    profileUrl: userInfo.profileUrl,
                    userName
                }
            )
            : (
                userDetails = {
                    emails: [
                        {
                            primary: true,
                            value: userInfo.email
                        }
                    ],
                    name: {
                        familyName: userInfo.lastName,
                        givenName: userInfo.firstName
                    },
                    password: userInfo.newPassword,
                    profileUrl: userInfo.profileUrl,
                    [SCIMConfigs.scim.enterpriseSchema] : {
                        askPassword: "true"
                    },
                    userName
                }
            );

        setIsSubmitting(true);                
        addUser(userDetails)
            .then((response: AxiosResponse) => {
                if (response.status === 202) {
                    dispatch(addAlert({
                        description: t(
                            "console:manage.features.users.notifications.addUserPendingApproval.success.description"
                        ),
                        level: AlertLevels.WARNING,
                        message: t(
                            "console:manage.features.users.notifications.addUserPendingApproval.success.message"
                        )
                    }));
                } else { 
                    dispatch(addAlert({
                        description: t(
                            "console:manage.features.users.notifications.addUser.success.description"
                        ),
                        level: AlertLevels.SUCCESS,
                        message: t(
                            "console:manage.features.users.notifications.addUser.success.message"
                        )
                    }));

                    if (wizardState?.RoleList?.roles && wizardState?.GroupList?.groups) {
                        assignUserRole(response.data, wizardState.RoleList.roles, wizardState.GroupList.groups);
                    }

                    if (isAdminUser) {
                        assignUserRole(response.data, userInfo.roles, userInfo.groups);
                        history.push(AppConstants.getPaths().get("ADMINISTRATOR_EDIT")
                            .replace(":id", response.data.id));
                    } else {
                        history.push(AppConstants.getPaths().get("USER_EDIT").replace(":id", response.data.id));
                    }

                }

                closeWizard();
            })
            .catch((error: AxiosError) => {
                // Axios throws a generic `Network Error` for 401 status.
                // As a temporary solution, a check to see if a response
                // is available has be used.
                if (!error.response || error.response.status === 401) {
                    closeWizard();
                    dispatch(addAlert({
                        description: t(
                            "console:manage.features.users.notifications.addUser.error.description"
                        ),
                        level: AlertLevels.ERROR,
                        message: t(
                            "console:manage.features.users.notifications.addUser.error.message"
                        )
                    }));
                } else if (error.response && error.response.data && error.response.data.detail) {
                    closeWizard();
                    dispatch(addAlert({
                        description: t(
                            "console:manage.features.users.notifications.addUser.error.description",
                            { description: error.response.data.detail }
                        ),
                        level: AlertLevels.ERROR,
                        message: t(
                            "console:manage.features.users.notifications.addUser.error.message"
                        )
                    }));
                } else {
                    closeWizard();
                    // Generic error message
                    dispatch(addAlert({
                        description: t(
                            "console:manage.features.users.notifications.addUser.genericError.description"
                        ),
                        level: AlertLevels.ERROR,
                        message: t(
                            "console:manage.features.users.notifications.addUser.genericError.message"
                        )
                    }));
                }
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    /**
     * Handles wizard step submit.
     *
     * @param values - Forms values to be stored in state.
     * @param formType - Type of the form.
     */
    const handleWizardFormSubmit = (values: any, formType: WizardStepsFormTypes) => {
        setCurrentWizardStep(currentWizardStep + 1);
        let processedValues: any = values;        

        if (isAdminUser) {
            // Add admin group and role names to the user.
            processedValues = {
                ...processedValues,
                groups: [
                    {
                        displayName: UserAccountTypes.ADMIN
                    }
                ],
                roles: [
                    {
                        displayName: UserAccountTypes.ADMIN
                    }
                ]
            };
        }

        setWizardState({ ...wizardState, [ formType ]: processedValues });
    };

    /**
     * Generates a summary of the wizard.
     *
     * @returns Summary of the wizard.
     */
    const generateWizardSummary = () => {
        if (!wizardState) {
            return;
        }

        const wizardData: WizardStateInterface = { ...wizardState };

        let summary: WizardStateInterface = {};

        for (const value of Object.values(wizardData)) {
            summary = {
                ...summary,
                ...value
            };
        }

        return merge(cloneDeep(summary));
    };

    const handleWizardFormFinish = (user: AddUserWizardStateInterface) => {
        let processedUser: AddUserWizardStateInterface = user;
        
        if (isAdminUser) {
            // If the user is an admin user, skip the group and role selection steps.
            // Find admin group and add it to the group list.
            const adminGroup: GroupsInterface = initialGroupList.find(
                (group: RolesInterface) => group.displayName === UserAccountTypes.ADMIN);
            const adminRole: RolesInterface = initialRoleList.find(
                (role: RolesInterface) => role.displayName === UserAccountTypes.ADMIN) as RolesInterface;
            const everyoneRole: RolesInterface = initialRoleList.find(
                (role: RolesInterface) => role.displayName === "everyone") as RolesInterface;

            
            if (!adminGroup || !adminRole) {
                return;
            }

            processedUser = {
                ...processedUser,
                groups: [ adminGroup ],
                roles: [ adminRole, everyoneRole ]
            };
        }

        addUserBasic(processedUser);
    };

    /**
     * Persists the profile image change done from the summary view in wizard state.
     *
     * @param url - Profile URL.
     */
    const handleProfileImageChange = (url: string): void => {
        setWizardState({
            ...wizardState,
            [ WizardStepsFormTypes.BASIC_DETAILS ]: {
                ...wizardState[ WizardStepsFormTypes.BASIC_DETAILS ],
                profileUrl: url
            }
        });
    };

    const ALL_STEPS: WizardStepInterface[] = [
        {
            content: (
                <AddUser
                    triggerSubmit={ submitGeneralSettings }
                    initialValues={ wizardState && wizardState[ WizardStepsFormTypes.BASIC_DETAILS ] }
                    emailVerificationEnabled={ emailVerificationEnabled }
                    onSubmit={ (values: AddUserWizardStateInterface) =>
                        handleWizardFormSubmit(values, WizardStepsFormTypes.BASIC_DETAILS) }
                />
            ),
            icon: getUserWizardStepIcons().general,
            title: t("console:manage.features.user.modals.addUserWizard.steps.basicDetails")
        },
        {
            content: (
                <AddUserGroup
                    triggerSubmit={ submitGroupList }
                    onSubmit={ (values: AddUserWizardStateInterface) =>
                        handleWizardFormSubmit(values, WizardStepsFormTypes.GROUP_LIST) }
                    initialValues={
                        {
                            groupList: groupList,
                            initialGroupList: initialGroupList,
                            initialTempGroupList: initialTempGroupList,
                            tempGroupList: tempGroupList
                        }
                    }
                    handleGroupListChange={ (groups: RolesInterface[]) => handleGroupListChange(groups) }
                    handleTempListChange={ (groups: RolesInterface[]) => handleAddedGroupListChange(groups) }
                    handleInitialTempListChange={ (groups: RolesInterface[]) =>
                        handleAddedGroupInitialListChange(groups) }
                    handleInitialGroupListChange={ (groups: RolesInterface[]) => handleInitialGroupListChange(groups) }
                    handleSetGroupId={ null }
                />
            ),
            icon: getUserWizardStepIcons().groups,
            title: t("console:manage.features.user.modals.addUserWizard.steps.groups")
        },
        {
            content: (
                viewRolePermissions
                    ? (<RolePermissions
                        data-testid={ `${ testId }-role-permission` }
                        handleNavigateBack={ handleViewRolePermission }
                        handleViewNextButton={ handleViewNextButton }
                        roleId={ selectedRoleId }
                    />)
                    : (<AddUserRole
                        triggerSubmit={ submitRoleList }
                        onSubmit={ (values: AddUserWizardStateInterface) =>
                            handleWizardFormSubmit(values, WizardStepsFormTypes.ROLE_LIST) }
                        initialValues={
                            {
                                initialRoleList: initialRoleList,
                                initialTempRoleList: initialTempRoleList,
                                roleList: roleList,
                                tempRoleList: tempRoleList
                            }
                        }
                        handleRoleListChange={ (roles: RolesInterface[] |
                             OrganizationRoleListItemInterface[]) => handleRoleListChange(roles) }
                        handleTempListChange={ (roles: RolesInterface[] |
                             OrganizationRoleListItemInterface[]) => handleAddedListChange(roles) }
                        handleInitialTempListChange={ (roles: RolesInterface[] |
                             OrganizationRoleListItemInterface[]) => handleAddedRoleInitialListChange(roles) }
                        handleInitialRoleListChange={ (roles: RolesInterface[] |
                             OrganizationRoleListItemInterface[]) => handleInitialRoleListChange(roles) }
                        handleSetRoleId={ (roleId: string) => handleRoleIdSet(roleId) }
                    />)
            ),
            icon: getUserWizardStepIcons().roles,
            title: t("console:manage.features.user.modals.addUserWizard.steps.roles")
        },
        {
            content: (
                <AddUserWizardSummary
                    triggerSubmit={ finishSubmit }
                    onSubmit={ handleWizardFormFinish }
                    summary={ generateWizardSummary() }
                    onProfileImageChange={ handleProfileImageChange }
                />
            ),
            icon: getUserWizardStepIcons().summary,
            title: t("console:manage.features.user.modals.addUserWizard.steps.summary")
        }
    ];

        /**
     * Resolves the step content.
     *
     * @returns Step content.
     */
    const resolveWizardTitle = (): string => {
        let wizardTitle: string = "";

        if (defaultUserTypeSelection === UserAccountTypes.USER) {
            userTypeSelection === (UserAccountTypesMain.INTERNAL) 
            ? wizardTitle += t("extensions:manage.users.wizard.addUser.title") 
            : wizardTitle += t("console:manage.features.parentOrgInvitations.addUserWizard.heading") 
        } 
        
        if (defaultUserTypeSelection === UserAccountTypes.ADMINISTRATOR) {
            adminTypeSelection === AdminAccountTypes.INTERNAL
                ? wizardTitle += t("extensions:manage.users.wizard.addAdmin.internal.title")
                : wizardTitle += t("extensions:manage.users.wizard.addAdmin.external.title");
        }

        if (wizardState && wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.firstName) {
            wizardTitle += " - " + wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.firstName;
        } else {
            wizardTitle += "";
        }

        return wizardTitle;
    };

    const resolveWizardSubHeading = (): string => {
        let wizardSubHeading: string = "";
        if (defaultUserTypeSelection === UserAccountTypes.USER) {
            (userTypeSelection === UserAccountTypesMain.INTERNAL)
            ? wizardSubHeading += t("extensions:manage.users.wizard.addUser.subtitle")
            : wizardSubHeading += t("console:manage.features.parentOrgInvitations.addUserWizard.description")
        }
        return wizardSubHeading
    };
    
    /**
     * Resolves the basic details step.
     *
     * @returns Basic details step.
     */
    const resolveBasicDetailsStep = (): WizardStepInterface => {

        if (wizardState && wizardState[ WizardStepsFormTypes.USER_TYPE ].userType === UserAccountTypes.USER) {
            if (userTypeSelection === UserAccountTypesMain.EXTERNAL) {
                return getInviteParentOrgUserStep();
            } 
        } 
    };

    /**
     * User group wizard step.
     * @returns Group wizard step.
     */
    const getUserGroupsWizardStep = (): WizardStepInterface => {

        return {
            content: (
                <AddConsumerUserGroups
                    triggerSubmit={ submitGroupList }
                    onSubmit={ (values: { groups : GroupsInterface[] }) => 
                        handleWizardFormSubmit(values, WizardStepsFormTypes.GROUP_LIST) }
                    initialValues={
                        {
                            groupList: groupList,
                            initialGroupList: initialGroupList,
                            initialTempGroupList: initialTempGroupList,
                            tempGroupList: tempGroupList
                        }
                    }
                    handleGroupListChange={ 
                        (groups: GroupsInterface[]) => handleGroupListChange(groups)
                    }
                    handleTempListChange={ 
                        (groups: GroupsInterface[]) => handleAddedGroupListChange(groups)
                    }
                    handleInitialTempListChange={ 
                        (groups: GroupsInterface[]) => handleAddedGroupInitialListChange(groups)
                    }
                    handleInitialGroupListChange={ 
                        (groups: GroupsInterface[]) => handleInitialGroupListChange(groups)
                    }
                    handleSetGroupId={ null }
                />
            ),
            icon: getUserWizardStepIcons().groups,
            name: WizardStepsFormTypes.GROUP_LIST,
            title: t("console:manage.features.user.modals.addUserWizard.steps.groups")
        };
    };

    /**
     * Summary wizard step.
     * @returns Summary wizard step.
     */
    const getSummaryWizardStep = (): WizardStepInterface => {

        return {
            content: (
                <AddConsumerUserWizardSummary
                    triggerSubmit={ finishSubmit }
                    onSubmit={ handleWizardFormFinish }
                    summary={ generateWizardSummary() }
                    onProfileImageChange={ handleProfileImageChange }
                />
            ),
            icon: getUserWizardStepIcons().summary,
            name: WizardStepsFormTypes.SUMMARY,
            title: t("console:manage.features.user.modals.addUserWizard.steps.summary")
        };
    };


    /**
     * User summary wizard step.
     * @returns User summary wizard step.
     */
    const getUserSummaryWizardStep = (): WizardStepInterface => {       
         
        return {
            content: (
                <AddUserWizardSummary
                    triggerSubmit={ finishSubmit }
                    selectedUserStore = { selectedUserStore }
                    username={ 
                        isAlphanumericUsername
                            ? wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.userName
                            : wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.email
                    }
                    password={ wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.newPassword }
                    isPasswordBased={ askPasswordFromUser }
                />
            ),
            icon: getUserWizardStepIcons().summary,
            name: WizardStepsFormTypes.USER_SUMMARY,
            title: t("console:manage.features.user.modals.addUserWizard.steps.summary")
        };
    };

        /**
     * This function handles sending the invitation to the external admin user.
     */
        const sendParentOrgInvitation = (invite: UserInviteInterface) => {
            debugger;
            if (invite != null) {
                setIsSubmitting(true);
    
                sendParentOrgUserInvite(invite)
                    .then(() => {
                        dispatch(addAlert({
                            description: t(
                                "console:manage.features.invite.notifications.sendInvite.success.description"
                            ),
                            level: AlertLevels.SUCCESS,
                            message: t(
                                "console:manage.features.invite.notifications.sendInvite.success.message"
                            )
                        }));
                        closeWizard();
                    })
                    .catch((error: AxiosError) => {
                        // Axios throws a generic `Network Error` for 401 status.
                        // As a temporary solution, a check to see if a response
                        // is available has be used.
                        console.log("ERROR: ", error);
                        if (!error.response || error.response.status === 401) {
                            closeWizard();
                            dispatch(addAlert({
                                description: t(
                                    "console:manage.features.invite.notifications.sendInvite.error.description"
                                ),
                                level: AlertLevels.ERROR,
                                message: t(
                                    "console:manage.features.invite.notifications.sendInvite.error.message"
                                )
                            }));
                        } else if (error.response.status === 403 &&
                            error?.response?.data?.code === UsersConstants.ERROR_COLLABORATOR_USER_LIMIT_REACHED) {
                            closeWizard();
                            dispatch(addAlert({
                                description: t(
                                    "extensions:manage.invite.notifications.sendInvite.limitReachError.description"
                                ),
                                level: AlertLevels.ERROR,
                                message: t(
                                    "extensions:manage.invite.notifications.sendInvite.limitReachError.message"
                                )
                            }));
                        } else if (error?.response?.data?.description) {
                            closeWizard();
                            dispatch(addAlert({
                                description: t(
                                    "console:manage.features.invite.notifications.sendInvite.error.description",
                                    { description: error.response.data.description }
                                ),
                                level: AlertLevels.ERROR,
                                message: t(
                                    "console:manage.features.invite.notifications.sendInvite.error.message"
                                )
                            }));
                        } else {
                            closeWizard();
                            // Generic error message
                            dispatch(addAlert({
                                description: t(
                                    "console:manage.features.invite.notifications.sendInvite.genericError.description"
                                ),
                                level: AlertLevels.ERROR,
                                message: t(
                                    "console:manage.features.invite.notifications.sendInvite.genericError.message"
                                )
                            }));
                        }
                    })
                    .finally(() => {
                        setIsSubmitting(false);
                    });
            } else {
                debugger;
            }
        };

    /**
     * Basic Wizard Step.
     * @returns Basic details wizard step.
     */
        const getInviteParentOrgUserStep = (): WizardStepInterface => {
            return {
                content: (
                    <InviteParentOrgUser
                        triggerSubmit={ submitGeneralSettings }
                        onSubmit={ (values: InternalAdminFormDataInterface | UserInviteInterface) => 
                            sendParentOrgInvitation(values as UserInviteInterface)
                        }
                        setFinishButtonDisabled={ (setFinishButtonDisabled) }
                    />
                ),
                icon: null,
                name: WizardStepsFormTypes.BASIC_DETAILS,
                title: t("console:manage.features.user.modals.addUserWizard.steps.basicDetails")
            };
        };

    /**
     * Check whether to hide step section or not.
     * @returns Show steps or not.
     */
    const showSteps = (): boolean => {
        if (defaultUserTypeSelection === UserAccountTypes.USER) {
            return true;
        }

        if (fixedGroupList?.length === 0) {
            return false;
        }       
        if (!conditionallyShowStepper) {
            return showStepper;
        } else {
            if (fixedGroupList?.length) {
                return showStepper && ((defaultUserTypeSelection !== UserAccountTypes.USER ||
                    fixedGroupList?.length !== 0));
            }

            return false;
        }
    };

    /**
     * Resolves the step content.
     *
     * @returns Step content.
     */
    const resolveStepContent = (): ReactElement => {
        console.log(wizardSteps[ currentWizardStep ]?.name);
        switch (wizardSteps[ currentWizardStep ]?.name) {
            case WizardStepsFormTypes.USER_TYPE:
                return getUserSelectionWizardStep()?.content;
            case WizardStepsFormTypes.BASIC_DETAILS:
                return resolveBasicDetailsStep()?.content;
            case WizardStepsFormTypes.GROUP_LIST:
                return getUserGroupsWizardStep()?.content;
            case WizardStepsFormTypes.SUMMARY:
                return getSummaryWizardStep()?.content;
            case WizardStepsFormTypes.USER_SUMMARY:
                return getUserSummaryWizardStep()?.content;
        }
    };

    const STEPS: WizardStepInterface[] = isAdminUser 
        ? [ ALL_STEPS[0], ...ALL_STEPS.slice(3) ]
        : OrganizationUtils.isCurrentOrganizationRoot()
            ? [ ...ALL_STEPS ]
            : [ ...ALL_STEPS.slice(0, 2), ...ALL_STEPS.slice(3) ];

    const showInternalUserWizard = (): ReactElement => {
        return (
            <>
                <Modal.Content className="steps-container">
                    <Steps.Group
                        current={ currentWizardStep }
                    >
                        { STEPS.map((step: WizardStepInterface, index: number) => (
                            <Steps.Step
                                key={ index }
                                icon={ step.icon }
                                title={ step.title }
                            />
                        )) }
                    </Steps.Group>
                </Modal.Content>
                <Modal.Content className="content-container" scrolling>
                    { alert && alertComponent }
                    { resolveStepContent() }
                    { STEPS[ currentWizardStep ].content }
                </Modal.Content>
            </>
        );
    }

    const showExternalUserWizard = (): ReactElement => {
        return (
            <>
                <Modal.Content className="content-container" scrolling>
                    { alert && alertComponent }
                    { resolveStepContent() }
                </Modal.Content>
            </>
        )
    }

    const handleModalAction = (): ReactElement => {
        return (
            <>
                <Modal.Actions>
                    <Grid>
                        <Grid.Row column={ 1 }>
                            <Grid.Column mobile={ 8 } tablet={ 8 } computer={ 8 }>
                                <LinkButton
                                    data-testid={ `${ testId }-cancel-button` }
                                    floated="left"
                                    onClick={ () => closeWizard() }
                                >
                                    { t("common:cancel") }
                                </LinkButton>
                            </Grid.Column>
                            <Grid.Column mobile={ 8 } tablet={ 8 } computer={ 8 }>
                                { currentWizardStep < STEPS.length - 1 && viewNextButton && (
                                    <PrimaryButton
                                        data-testid={ `${ testId }-next-button` }
                                        floated="right"
                                        onClick={ navigateToNext }
                                    >
                                        { t("console:manage.features.user.modals.addUserWizard.buttons.next") }
                                        <Icon name="arrow right"/>
                                    </PrimaryButton>
                                ) }
                                { currentWizardStep === STEPS.length - 1 && (
                                    <PrimaryButton
                                        data-testid={ `${ testId }-finish-button` }
                                        floated="right"
                                        onClick={ navigateToNext }
                                        loading={ isSubmitting }
                                        disabled={ isSubmitting }
                                    >
                                        Finish</PrimaryButton>
                                ) }
                                { currentWizardStep > 0 && (
                                    <LinkButton
                                        data-testid={ `${ testId }-previous-button` }
                                        floated="right"
                                        onClick={ navigateToPrevious }
                                    >
                                        <Icon name="arrow left"/>
                                        { t("console:manage.features.user.modals.addUserWizard.buttons.previous") }
                                    </LinkButton>
                                ) }
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Modal.Actions>
            </>
        )
    }

    return (
        <Modal
            data-testid={ testId }
            open={ true }
            className="wizard application-create-wizard"
            dimmer="blurring"
            size="small"
            onClose={ closeWizard }
            closeOnDimmerClick={ false }
            closeOnEscape
        >
            <Modal.Header className="wizard-header">
                {
                    wizardState && wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.firstName
                        ? " - " + wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.firstName
                        : ""
                }
                { resolveWizardTitle() }
                <Heading as="h6">
                    { resolveWizardSubHeading() }
                </Heading>
            </Modal.Header>
            { isSubOrg ? (
                <>
                    { (userTypeSelection === UserAccountTypesMain.INTERNAL) && showInternalUserWizard() }
                    { (userTypeSelection === UserAccountTypesMain.EXTERNAL) && showExternalUserWizard() }
                </>
            ) : (
                <>
                    { showInternalUserWizard() }
                </>
            )}
            { handleModalAction() }
        </Modal>
    );
};

/**
 * Default props for the add user wizard.
 */
AddUserWizard.defaultProps = {
    compact: false,
    conditionallyShowStepper: false,
    currentStep: 0,
    emailVerificationEnabled: false,
    showStepper: true,
    // Submit Step changed to temporarily disable the summary step.
    // submitStep: WizardStepsFormTypes.SUMMARY
    submitStep: WizardStepsFormTypes.GROUP_LIST
};
