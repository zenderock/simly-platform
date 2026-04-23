package tests

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
)

type publicAPIFixture struct {
	MainOrgID               int
	MainAppID               int
	SecondaryAppID          int
	SandboxAppID            int
	MainLiveKey             string
	MainSandboxKey          string
	MismatchSandboxKey      string
	RevokedKey              string
	MainDeviceID            int
	SecondaryDeviceID       int
	NoDeviceOrgID           int
	NoDeviceAppID           int
	NoDeviceKey             string
	MainMessageID           int
	OtherOrgMessageID       int
	MainDraftCampaignID     int
	MainScheduledCampaignID int
	OtherAppDraftCampaignID int
	OtherOrgCampaignID      int
	WhiteLabelCustomOrgID   int
	WhiteLabelCustomAppID   int
	WhiteLabelCustomKey     string
	WhiteLabelDefaultOrgID  int
	WhiteLabelDefaultAppID  int
	WhiteLabelDefaultKey    string
	WhiteLabelPendingToken  string
	WhiteLabelUsedToken     string
}

func seedPublicAPIFixture(t *testing.T, env *publicAPITestEnv) *publicAPIFixture {
	t.Helper()

	ctx := context.Background()
	suffix := nextPublicAPITestSuffix()

	mainOrg := createOrganizationForTest(t, ctx, env, suffix+"-org", model.PlanPro, nil)
	mainApp := createApplicationForTest(t, ctx, env, mainOrg.ID, suffix+"-app-live", false)
	secondaryApp := createApplicationForTest(t, ctx, env, mainOrg.ID, suffix+"-app-secondary", false)
	sandboxApp := createApplicationForTest(t, ctx, env, mainOrg.ID, suffix+"-app-sandbox", true)

	mainLiveKey := createAPIKeyForTest(t, ctx, env, mainOrg.ID, mainApp.ID, suffix+"-live-key", false)
	mainSandboxKey := createAPIKeyForTest(t, ctx, env, mainOrg.ID, sandboxApp.ID, suffix+"-sandbox-key", true)
	mismatchSandboxKey := createAPIKeyForTest(t, ctx, env, mainOrg.ID, mainApp.ID, suffix+"-mismatch-sandbox-key", true)

	revokedName := suffix + "-revoked-key"
	if len(revokedName) > 10 {
		revokedName = revokedName[len(revokedName)-10:]
	}
	revokedResp, err := env.APIKeys.CreateAPIKeyWithSandbox(ctx, mainOrg.ID, mainApp.ID, revokedName, false)
	if err != nil {
		t.Fatalf("failed to create revoked api key: %v", err)
	}
	if err := env.Store.DeleteAPIKey(ctx, revokedResp.ID, mainOrg.ID); err != nil {
		t.Fatalf("failed to revoke api key: %v", err)
	}

	mainDevice := createConfiguredDeviceForTest(t, ctx, env, mainOrg.ID, &mainApp.ID, suffix+"-device-main", "+33610000001", "33,34")
	secondaryDevice := createConfiguredDeviceForTest(t, ctx, env, mainOrg.ID, &secondaryApp.ID, suffix+"-device-secondary", "+33610000002", "35,36")

	mainMessage := createMessageForTest(t, ctx, env, mainOrg.ID, &mainApp.ID, &mainDevice.ID, "+33620000001", "Seeded main message", model.MessageStatusDelivered)

	mainList := createContactListForTest(t, ctx, env, mainOrg.ID, &mainApp.ID, suffix+"-list-main")
	mainContact := createContactForTest(t, ctx, env, mainOrg.ID, &mainApp.ID, "Alice", "Public", "+33630000001")
	if err := env.Store.AddContactsToList(ctx, mainList.ID, []int{mainContact.ID}); err != nil {
		t.Fatalf("failed to add main contact to list: %v", err)
	}

	draftCampaign := createCampaignForTest(t, ctx, env, mainOrg.ID, mainApp.ID, mainList.ID, mainDevice.ID, suffix+"-campaign-draft", model.CampaignStatusDraft, nil)
	scheduledAt := time.Now().Add(2 * time.Hour).UTC()
	scheduledCampaign := createCampaignForTest(t, ctx, env, mainOrg.ID, mainApp.ID, mainList.ID, mainDevice.ID, suffix+"-campaign-scheduled", model.CampaignStatusScheduled, &scheduledAt)
	otherAppDraft := createCampaignForTest(t, ctx, env, mainOrg.ID, secondaryApp.ID, 0, secondaryDevice.ID, suffix+"-campaign-other-app", model.CampaignStatusDraft, nil)

	otherOrg := createOrganizationForTest(t, ctx, env, suffix+"-org-other", model.PlanPro, nil)
	otherApp := createApplicationForTest(t, ctx, env, otherOrg.ID, suffix+"-app-other", false)
	otherDevice := createConfiguredDeviceForTest(t, ctx, env, otherOrg.ID, &otherApp.ID, suffix+"-device-other", "+33610000003", "37,38")
	otherMessage := createMessageForTest(t, ctx, env, otherOrg.ID, &otherApp.ID, &otherDevice.ID, "+33620000002", "Seeded other-org message", model.MessageStatusDelivered)
	otherList := createContactListForTest(t, ctx, env, otherOrg.ID, &otherApp.ID, suffix+"-list-other")
	otherContact := createContactForTest(t, ctx, env, otherOrg.ID, &otherApp.ID, "Bob", "Other", "+33630000002")
	if err := env.Store.AddContactsToList(ctx, otherList.ID, []int{otherContact.ID}); err != nil {
		t.Fatalf("failed to add other-org contact to list: %v", err)
	}
	otherCampaign := createCampaignForTest(t, ctx, env, otherOrg.ID, otherApp.ID, otherList.ID, otherDevice.ID, suffix+"-campaign-other-org", model.CampaignStatusDraft, nil)

	noDeviceOrg := createOrganizationForTest(t, ctx, env, suffix+"-org-no-device", model.PlanPro, nil)
	noDeviceApp := createApplicationForTest(t, ctx, env, noDeviceOrg.ID, suffix+"-app-no-device", false)
	noDeviceKey := createAPIKeyForTest(t, ctx, env, noDeviceOrg.ID, noDeviceApp.ID, suffix+"-no-device-key", false)

	whiteLabelCustomOrg := createOrganizationForTest(t, ctx, env, suffix+"-org-wl-custom", model.PlanWhiteLabel, nil)
	customBrandName := "Custom Gateway"
	customLogoURL := "https://example.com/logo.png"
	customColor := "#0F4C81"
	if err := env.Store.UpdateOrganizationBranding(ctx, whiteLabelCustomOrg.ID, &customBrandName, &customLogoURL, &customColor); err != nil {
		t.Fatalf("failed to set white-label branding: %v", err)
	}
	whiteLabelCustomApp := createApplicationForTest(t, ctx, env, whiteLabelCustomOrg.ID, suffix+"-app-wl-custom", false)
	whiteLabelCustomKey := createAPIKeyForTest(t, ctx, env, whiteLabelCustomOrg.ID, whiteLabelCustomApp.ID, suffix+"-wl-custom-key", false)

	whiteLabelDefaultOrg := createOrganizationForTest(t, ctx, env, suffix+"-org-wl-default", model.PlanWhiteLabel, nil)
	whiteLabelDefaultApp := createApplicationForTest(t, ctx, env, whiteLabelDefaultOrg.ID, suffix+"-app-wl-default", false)
	whiteLabelDefaultKey := createAPIKeyForTest(t, ctx, env, whiteLabelDefaultOrg.ID, whiteLabelDefaultApp.ID, suffix+"-wl-default-key", false)
	usedDevice := createConfiguredDeviceForTest(t, ctx, env, whiteLabelDefaultOrg.ID, &whiteLabelDefaultApp.ID, suffix+"-device-wl-used", "+33610000004", "39")

	pendingToken := createDeviceLinkTokenForTest(t, ctx, env, whiteLabelDefaultOrg.ID, whiteLabelDefaultApp.ID, suffix+"-token-pending", time.Now().Add(10*time.Minute))
	usedToken := createDeviceLinkTokenForTest(t, ctx, env, whiteLabelDefaultOrg.ID, whiteLabelDefaultApp.ID, suffix+"-token-used", time.Now().Add(10*time.Minute))
	if err := env.Store.MarkDeviceLinkTokenUsed(ctx, usedToken, usedDevice.ID); err != nil {
		t.Fatalf("failed to mark used token: %v", err)
	}

	return &publicAPIFixture{
		MainOrgID:               mainOrg.ID,
		MainAppID:               mainApp.ID,
		SecondaryAppID:          secondaryApp.ID,
		SandboxAppID:            sandboxApp.ID,
		MainLiveKey:             mainLiveKey,
		MainSandboxKey:          mainSandboxKey,
		MismatchSandboxKey:      mismatchSandboxKey,
		RevokedKey:              revokedResp.RawKey,
		MainDeviceID:            mainDevice.ID,
		SecondaryDeviceID:       secondaryDevice.ID,
		NoDeviceOrgID:           noDeviceOrg.ID,
		NoDeviceAppID:           noDeviceApp.ID,
		NoDeviceKey:             noDeviceKey,
		MainMessageID:           mainMessage.ID,
		OtherOrgMessageID:       otherMessage.ID,
		MainDraftCampaignID:     draftCampaign.ID,
		MainScheduledCampaignID: scheduledCampaign.ID,
		OtherAppDraftCampaignID: otherAppDraft.ID,
		OtherOrgCampaignID:      otherCampaign.ID,
		WhiteLabelCustomOrgID:   whiteLabelCustomOrg.ID,
		WhiteLabelCustomAppID:   whiteLabelCustomApp.ID,
		WhiteLabelCustomKey:     whiteLabelCustomKey,
		WhiteLabelDefaultOrgID:  whiteLabelDefaultOrg.ID,
		WhiteLabelDefaultAppID:  whiteLabelDefaultApp.ID,
		WhiteLabelDefaultKey:    whiteLabelDefaultKey,
		WhiteLabelPendingToken:  pendingToken,
		WhiteLabelUsedToken:     usedToken,
	}
}

func createOrganizationForTest(t *testing.T, ctx context.Context, env *publicAPITestEnv, name string, plan string, burstOverride *int) *model.Organization {
	t.Helper()

	limits := model.GetPlanLimits(plan)
	if burstOverride != nil {
		limits.SMSBurst = *burstOverride
	}

	org := &model.Organization{
		Name:                     name,
		Slug:                     name,
		Plan:                     plan,
		SMSMonthlyLimit:          limits.SMSMonthly,
		SMSBurstLimit:            limits.SMSBurst,
		MaxDevices:               limits.MaxDevices,
		MaxSimsPerDevice:         limits.MaxSimsPerDevice,
		MaxApplications:          limits.MaxApplications,
		MaxContacts:              limits.MaxContacts,
		MaxCampaigns:             limits.MaxCampaigns,
		MaxRecipientsPerCampaign: limits.MaxRecipientsPerCampaign,
		SMSThrottleRateSeconds:   0,
		SendWindowStart:          0,
		SendWindowEnd:            23,
		SendWindowTimezone:       "UTC",
	}

	if err := env.Store.CreateOrganization(ctx, org); err != nil {
		t.Fatalf("failed to create organization %s: %v", name, err)
	}
	if err := env.Store.UpdateOrganizationPlan(ctx, org.ID, plan, limits.SMSMonthly, limits.SMSBurst, limits.MaxDevices, limits.MaxSimsPerDevice, limits.MaxApplications, limits.MaxContacts, limits.MaxCampaigns, limits.MaxRecipientsPerCampaign); err != nil {
		t.Fatalf("failed to update organization plan for %s: %v", name, err)
	}

	return org
}

func createApplicationForTest(t *testing.T, ctx context.Context, env *publicAPITestEnv, orgID int, name string, isSandbox bool) *model.Application {
	t.Helper()

	app := &model.Application{
		OrganizationID: orgID,
		Name:           name,
		IsSandbox:      isSandbox,
		AlertSettings:  map[string]interface{}{},
	}

	if err := env.Store.CreateApplication(ctx, app); err != nil {
		t.Fatalf("failed to create application %s: %v", name, err)
	}

	return app
}

func createAPIKeyForTest(t *testing.T, ctx context.Context, env *publicAPITestEnv, orgID int, appID int, name string, isSandbox bool) string {
	t.Helper()

	shortName := name
	if len(shortName) > 10 {
		shortName = shortName[len(shortName)-10:]
	}

	resp, err := env.APIKeys.CreateAPIKeyWithSandbox(ctx, orgID, appID, shortName, isSandbox)
	if err != nil {
		t.Fatalf("failed to create api key %s (%s): %v", name, shortName, err)
	}

	return resp.RawKey
}

func createConfiguredDeviceForTest(t *testing.T, ctx context.Context, env *publicAPITestEnv, orgID int, appID *int, name string, phoneNumber string, prefixes string) *model.Device {
	t.Helper()

	device := &model.Device{
		OrganizationID: orgID,
		ApplicationID:  appID,
		Name:           name,
		Model:          "Pixel Test",
		FCMToken:       name + "-fcm-token",
		BatteryLevel:   90,
		SignalStrength: 4,
		Tags:           []string{"public-api"},
	}
	if err := env.Store.CreateDevice(ctx, device); err != nil {
		t.Fatalf("failed to create device %s: %v", name, err)
	}
	if err := env.Store.UpdateDeviceHealth(ctx, device.ID, 90, 4, "online"); err != nil {
		t.Fatalf("failed to update device health for %s: %v", name, err)
	}
	if err := env.Store.UpdateDeviceSimCards(ctx, device.ID, []model.UpdateSimCardRequest{
		{
			SlotIndex:         0,
			PhoneNumber:       phoneNumber,
			Operator:          "Orange",
			IsActive:          true,
			SupportedPrefixes: prefixes,
		},
	}); err != nil {
		t.Fatalf("failed to configure device SIMs for %s: %v", name, err)
	}

	configured, err := env.Store.GetDeviceByID(ctx, device.ID)
	if err != nil {
		t.Fatalf("failed to reload device %s: %v", name, err)
	}
	return configured
}

func createMessageForTest(t *testing.T, ctx context.Context, env *publicAPITestEnv, orgID int, appID *int, deviceID *int, to string, body string, status string) *model.Message {
	t.Helper()

	msg := &model.Message{
		OrganizationID: orgID,
		ApplicationID:  appID,
		DeviceID:       deviceID,
		ToNumber:       to,
		Body:           body,
		Status:         status,
		Direction:      "outbound",
		Priority:       "normal",
		RequiredTags:   []string{},
	}
	if err := env.Store.CreateMessage(ctx, msg); err != nil {
		t.Fatalf("failed to create message for %s: %v", to, err)
	}
	return msg
}

func createContactForTest(t *testing.T, ctx context.Context, env *publicAPITestEnv, orgID int, appID *int, firstName string, lastName string, phone string) *model.Contact {
	t.Helper()

	contact := &model.Contact{
		OrganizationID: orgID,
		ApplicationID:  appID,
		FirstName:      firstName,
		LastName:       lastName,
		PhoneNumber:    phone,
		Email:          fmt.Sprintf("%s.%s@example.com", firstName, lastName),
		Tags:           []string{"public-api"},
	}
	if err := env.Store.CreateContact(ctx, contact); err != nil {
		t.Fatalf("failed to create contact %s: %v", phone, err)
	}
	return contact
}

func createContactListForTest(t *testing.T, ctx context.Context, env *publicAPITestEnv, orgID int, appID *int, name string) *model.ContactList {
	t.Helper()

	list := &model.ContactList{
		OrganizationID: orgID,
		ApplicationID:  appID,
		Name:           name,
		Description:    "public api test list",
	}
	if err := env.Store.CreateContactList(ctx, list); err != nil {
		t.Fatalf("failed to create contact list %s: %v", name, err)
	}
	return list
}

func createCampaignForTest(t *testing.T, ctx context.Context, env *publicAPITestEnv, orgID int, appID int, listID int, deviceID int, name string, status string, scheduledAt *time.Time) *model.Campaign {
	t.Helper()

	var appIDPtr *int
	if appID != 0 {
		appIDPtr = &appID
	}
	var listIDPtr *int
	if listID != 0 {
		listIDPtr = &listID
	}
	var deviceIDPtr *int
	if deviceID != 0 {
		deviceIDPtr = &deviceID
	}

	campaign := &model.Campaign{
		OrganizationID: orgID,
		ApplicationID:  appIDPtr,
		Name:           name,
		TemplateBody:   "Hello {{first_name}}",
		ListID:         listIDPtr,
		DeviceID:       deviceIDPtr,
		Status:         status,
		ScheduledAt:    scheduledAt,
		UseAllDevices:  false,
		AutoReschedule: false,
	}
	if err := env.Store.CreateCampaign(ctx, campaign); err != nil {
		t.Fatalf("failed to create campaign %s: %v", name, err)
	}
	return campaign
}

func createDeviceLinkTokenForTest(t *testing.T, ctx context.Context, env *publicAPITestEnv, orgID int, appID int, seed string, expiresAt time.Time) string {
	t.Helper()

	token := seed + "-token"
	if err := env.Store.CreateDeviceLinkToken(ctx, orgID, appID, token, expiresAt); err != nil {
		t.Fatalf("failed to create device link token %s: %v", seed, err)
	}
	return token
}
